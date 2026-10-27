import {
  and,
  count,
  desc,
  eq,
  gte,
  ilike,
  inArray,
  or,
  sql,
} from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { db } from './index.ts';
import { artworks, orders, posts, profiles, users } from './schema.ts';

export type AdminTimeframe = 7 | 30 | 90 | 'all';
export type AdminContentKind = 'artworks' | 'community';
export type AdminArtworkFilter = 'all' | 'direct';
export type AdminRoleFilter = 'admin' | 'artist' | 'collector' | 'art_lover' | 'all';

function getPageParams(pageValue: unknown, pageSizeValue: unknown) {
  const page = Math.max(1, Math.floor(Number(pageValue) || 1));
  const pageSize = Math.min(50, Math.max(1, Math.floor(Number(pageSizeValue) || 20)));
  return { page, pageSize, offset: (page - 1) * pageSize };
}

function getCutoff(timeframe: AdminTimeframe): Date | undefined {
  return timeframe === 'all'
    ? undefined
    : new Date(Date.now() - timeframe * 24 * 60 * 60 * 1000);
}

export async function getAdminOverview(timeframe: AdminTimeframe) {
  const cutoff = getCutoff(timeframe);
  const userChartWhere = cutoff ? gte(users.createdAt, cutoff) : undefined;
  const artworkChartWhere = and(
    eq(artworks.isDemo, false),
    eq(profiles.isDemo, false),
    ...(cutoff ? [gte(artworks.createdAt, cutoff)] : [])
  );
  const postChartWhere = and(
    eq(posts.isDemo, false),
    eq(profiles.isDemo, false),
    ...(cutoff ? [gte(posts.createdAt, cutoff)] : [])
  );
  const orderChartWhere = and(
    eq(profiles.isDemo, false),
    ...(cutoff ? [gte(orders.createdAt, cutoff)] : [])
  );
  const bucket = timeframe === 'all' ? 'month' : 'day';
  const dateLabel = (column: typeof users.createdAt | typeof artworks.createdAt | typeof posts.createdAt | typeof orders.createdAt) =>
    sql<string>`to_char(date_trunc(${bucket}, ${column}), 'YYYY-MM-DD')`;

  const [
    [userCount],
    [artistCount],
    [collectorCount],
    [artLoverCount],
    [adminCount],
    [artworkCount],
    [communityPostCount],
    [orderSummary],
    registrationSeries,
    artworkSeries,
    communitySeries,
    orderSeries,
  ] = await Promise.all([
    db.select({ value: count() }).from(users),
    db
      .select({ value: count() })
      .from(users)
      .innerJoin(profiles, eq(profiles.id, users.uid))
      .where(and(eq(profiles.role, 'artist'), eq(profiles.isDemo, false))),
    db
      .select({ value: count() })
      .from(users)
      .innerJoin(profiles, eq(profiles.id, users.uid))
      .where(and(eq(profiles.role, 'collector'), eq(profiles.isDemo, false))),
    db
      .select({ value: count() })
      .from(users)
      .innerJoin(profiles, eq(profiles.id, users.uid))
      .where(and(eq(profiles.role, 'art_lover'), eq(profiles.isDemo, false))),
    db
      .select({ value: count() })
      .from(users)
      .innerJoin(profiles, eq(profiles.id, users.uid))
      .where(and(eq(profiles.role, 'admin'), eq(profiles.isDemo, false))),
    db
      .select({ value: count() })
      .from(artworks)
      .innerJoin(profiles, eq(profiles.id, artworks.artistId))
      .where(and(eq(artworks.isDemo, false), eq(profiles.isDemo, false))),
    db
      .select({ value: count() })
      .from(posts)
      .innerJoin(profiles, eq(profiles.id, posts.authorId))
      .where(and(eq(posts.isDemo, false), eq(profiles.isDemo, false))),
    db
      .select({
        total: count(),
        pending: count(sql`case when ${orders.status} = 'awaiting_payment' then 1 end`),
        created: count(sql`case when ${orders.status} = 'intent_created' then 1 end`),
        cancelled: count(sql`case when ${orders.status} = 'cancelled' then 1 end`),
      })
      .from(orders)
      .innerJoin(profiles, eq(profiles.id, orders.buyerId))
      .where(eq(profiles.isDemo, false)),
    db
      .select({ date: dateLabel(users.createdAt), count: count() })
      .from(users)
      .where(userChartWhere)
      .groupBy(dateLabel(users.createdAt))
      .orderBy(dateLabel(users.createdAt)),
    db
      .select({ date: dateLabel(artworks.createdAt), count: count() })
      .from(artworks)
      .innerJoin(profiles, eq(profiles.id, artworks.artistId))
      .where(artworkChartWhere)
      .groupBy(dateLabel(artworks.createdAt))
      .orderBy(dateLabel(artworks.createdAt)),
    db
      .select({ date: dateLabel(posts.createdAt), count: count() })
      .from(posts)
      .innerJoin(profiles, eq(profiles.id, posts.authorId))
      .where(postChartWhere)
      .groupBy(dateLabel(posts.createdAt))
      .orderBy(dateLabel(posts.createdAt)),
    db
      .select({
        date: dateLabel(orders.createdAt),
        intents: count(),
        pending: count(sql`case when ${orders.status} = 'awaiting_payment' then 1 end`),
      })
      .from(orders)
      .innerJoin(profiles, eq(profiles.id, orders.buyerId))
      .where(orderChartWhere)
      .groupBy(dateLabel(orders.createdAt))
      .orderBy(dateLabel(orders.createdAt)),
  ]);

  return {
    counts: {
      users: userCount.value,
      artists: artistCount.value,
      collectors: collectorCount.value,
      artworks: artworkCount.value,
      communityPosts: communityPostCount.value,
      purchaseIntents: orderSummary.total,
      pendingPaymentIntents: orderSummary.pending,
      createdIntents: orderSummary.created,
      cancelledIntents: orderSummary.cancelled,
      completedPurchases: null,
    },
    payments: {
      configured: false,
      message: 'Payment integration not configured.',
      confirmed: 0,
    },
    timeframe,
    series: {
      registrations: registrationSeries,
      artworks: artworkSeries,
      communityPosts: communitySeries,
      purchaseIntents: orderSeries,
      confirmedPayments: [],
      roleDistribution: [
        { role: 'admin', count: adminCount.value },
        { role: 'artist', count: artistCount.value },
        { role: 'collector', count: collectorCount.value },
        { role: 'art_lover', count: artLoverCount.value },
      ],
    },
  };
}

export async function getAdminUsers(options: {
  page?: unknown;
  pageSize?: unknown;
  role?: AdminRoleFilter;
  search?: string;
}) {
  const { page, pageSize, offset } = getPageParams(options.page, options.pageSize);
  const role = options.role && options.role !== 'all' ? options.role : undefined;
  const search = options.search?.trim().slice(0, 100);
  const filters = [
    ...(role ? [eq(profiles.role, role)] : []),
    ...(search
      ? [or(ilike(profiles.fullName, `%${search}%`), ilike(profiles.handle, `%${search}%`))]
      : []),
  ];
  const where = and(...filters);
  const [totalResult, records] = await Promise.all([
    db
      .select({ value: count() })
      .from(users)
      .leftJoin(profiles, eq(profiles.id, users.uid))
      .where(where),
    db
      .select({
        profileId: profiles.id,
        fullName: profiles.fullName,
        handle: profiles.handle,
        role: profiles.role,
        createdAt: users.createdAt,
        artworkCount: count(artworks.id),
        availableArtworkCount: count(
          sql`case when ${artworks.availability} = 'available' then 1 end`
        ),
      })
      .from(users)
      .leftJoin(profiles, eq(profiles.id, users.uid))
      .leftJoin(
        artworks,
        and(eq(artworks.artistId, profiles.id), eq(artworks.isDemo, false))
      )
      .where(where)
      .groupBy(profiles.id, profiles.fullName, profiles.handle, profiles.role, users.uid, users.createdAt)
      .orderBy(desc(users.createdAt))
      .limit(pageSize)
      .offset(offset),
  ]);

  const profileIds = records
    .map((record) => record.profileId)
    .filter((profileId): profileId is string => profileId !== null);
  const purchaseIntentCounts = profileIds.length
    ? await db
        .select({ sellerId: orders.sellerId, intents: count() })
        .from(orders)
        .where(inArray(orders.sellerId, profileIds))
        .groupBy(orders.sellerId)
    : [];
  const intentsBySeller = new Map(
    purchaseIntentCounts.map(({ sellerId, intents }) => [sellerId, intents])
  );

  return {
    records: records.map((record) => ({
      ...record,
      purchaseIntentCount: record.profileId
        ? intentsBySeller.get(record.profileId) || 0
        : 0,
    })),
    page,
    pageSize,
    total: totalResult[0].value,
  };
}

export async function getAdminContent(options: {
  kind: AdminContentKind;
  page?: unknown;
  pageSize?: unknown;
  search?: string;
  artistName?: string;
  artworkFilter?: AdminArtworkFilter;
}) {
  const { page, pageSize, offset } = getPageParams(options.page, options.pageSize);
  const search = options.search?.trim().slice(0, 100);
  const artistName = options.artistName?.trim().slice(0, 100);

  if (options.kind === 'community') {
    const filters = [
      eq(posts.isDemo, false),
      eq(profiles.isDemo, false),
      ...(artistName ? [ilike(profiles.fullName, `%${artistName}%`)] : []),
      ...(search
        ? [or(ilike(posts.title, `%${search}%`), ilike(profiles.fullName, `%${search}%`))]
        : []),
    ];
    const where = and(...filters);
    const [totalResult, records] = await Promise.all([
      db
        .select({ value: count() })
        .from(posts)
        .innerJoin(profiles, eq(profiles.id, posts.authorId))
        .where(where),
      db
        .select({
          id: posts.id,
          kind: sql<'community'>`'community'`,
          title: posts.title,
          artistId: profiles.id,
          artistName: profiles.fullName,
          artistHandle: profiles.handle,
          createdAt: posts.createdAt,
          imageKey: posts.imageKey,
          artworkId: posts.artworkId,
          saleMode: sql<null>`null`,
          availability: sql<null>`null`,
          price: sql<null>`null`,
          currency: sql<null>`null`,
        })
        .from(posts)
        .innerJoin(profiles, eq(profiles.id, posts.authorId))
        .where(where)
        .orderBy(desc(posts.createdAt))
        .limit(pageSize)
        .offset(offset),
    ]);
    return { records, page, pageSize, total: totalResult[0].value };
  }

  const filters = [
    eq(artworks.isDemo, false),
    eq(profiles.isDemo, false),
    ...(options.artworkFilter === 'direct' ? [sql`${artworks.saleMode} <> 'negotiation_only'`] : []),
    ...(artistName ? [ilike(profiles.fullName, `%${artistName}%`)] : []),
    ...(search
      ? [or(ilike(artworks.title, `%${search}%`), ilike(profiles.fullName, `%${search}%`))]
      : []),
  ];
  const where = and(...filters);
  const [totalResult, records] = await Promise.all([
    db
      .select({ value: count() })
      .from(artworks)
      .innerJoin(profiles, eq(profiles.id, artworks.artistId))
      .where(where),
    db
      .select({
        id: artworks.id,
        kind: sql<'artwork'>`'artwork'`,
        title: artworks.title,
        artistId: profiles.id,
        artistName: profiles.fullName,
        artistHandle: profiles.handle,
        createdAt: artworks.createdAt,
        imageKey: artworks.imageKey,
        artworkId: sql<string>`null`,
        saleMode: artworks.saleMode,
        availability: artworks.availability,
        price: artworks.price,
        currency: artworks.currency,
      })
      .from(artworks)
      .innerJoin(profiles, eq(profiles.id, artworks.artistId))
      .where(where)
      .orderBy(desc(artworks.createdAt))
      .limit(pageSize)
      .offset(offset),
  ]);
  return { records, page, pageSize, total: totalResult[0].value };
}

export async function getAdminOrders(options: {
  page?: unknown;
  pageSize?: unknown;
}) {
  const { page, pageSize, offset } = getPageParams(options.page, options.pageSize);
  const sellerProfile = alias(profiles, 'seller_profile');
  const validBuyer = eq(profiles.isDemo, false);
  const [totalResult, records] = await Promise.all([
    db
      .select({ value: count() })
      .from(orders)
      .innerJoin(profiles, eq(profiles.id, orders.buyerId))
      .where(validBuyer),
    db
      .select({
        id: orders.id,
        artworkTitle: artworks.title,
        buyerName: profiles.fullName,
        sellerName: sellerProfile.fullName,
        amount: orders.amount,
        currency: orders.currency,
        status: orders.status,
        createdAt: orders.createdAt,
      })
      .from(orders)
      .innerJoin(profiles, eq(profiles.id, orders.buyerId))
      .innerJoin(artworks, eq(artworks.id, orders.artworkId))
      .innerJoin(sellerProfile, eq(sellerProfile.id, orders.sellerId))
      .where(validBuyer)
      .orderBy(desc(orders.createdAt))
      .limit(pageSize)
      .offset(offset),
  ]);
  return { records, page, pageSize, total: totalResult[0].value };
}
