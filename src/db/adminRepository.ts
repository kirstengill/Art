import { getSupabaseServiceClient } from '../lib/supabase-server.ts';
import type {
  AdminArtworkFilter,
  AdminContentKind,
  AdminRoleFilter,
  AdminTimeframe,
} from '../types/admin';

export type {
  AdminArtworkFilter,
  AdminContentKind,
  AdminRoleFilter,
  AdminTimeframe,
} from '../types/admin';

type Row = Record<string, unknown>;

async function getAll(table: string): Promise<Row[]> {
  const db = getSupabaseServiceClient();
  const result: Row[] = [];
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await db
      .from(table)
      .select('*')
      .range(offset, offset + 999);
    if (error) throw new Error(`Unable to query ${table}: ${error.message}`);
    result.push(...(data as Row[]));
    if (data.length < 1000) return result;
  }
}

function getPageParams(pageValue: unknown, pageSizeValue: unknown) {
  const page = Math.max(1, Math.floor(Number(pageValue) || 1));
  const pageSize = Math.min(50, Math.max(1, Math.floor(Number(pageSizeValue) || 20)));
  return { page, pageSize, offset: (page - 1) * pageSize };
}

function isPublic(row: Row): boolean {
  return row.is_demo !== true;
}

function withinTimeframe(value: unknown, timeframe: AdminTimeframe): boolean {
  if (timeframe === 'all') return true;
  const date = new Date(String(value));
  return Number.isFinite(date.getTime()) && date.getTime() >= Date.now() - timeframe * 86400000;
}

function dateBucket(value: unknown, timeframe: AdminTimeframe): string {
  const date = new Date(String(value));
  if (timeframe === 'all') {
    date.setUTCDate(1);
    return date.toISOString().slice(0, 10);
  }
  return date.toISOString().slice(0, 10);
}

function series(rows: Row[], timestamp: string, timeframe: AdminTimeframe) {
  const counts = new Map<string, number>();
  for (const row of rows) {
    if (!withinTimeframe(row[timestamp], timeframe)) continue;
    const date = dateBucket(row[timestamp], timeframe);
    counts.set(date, (counts.get(date) || 0) + 1);
  }
  return Array.from(counts, ([date, count]) => ({ date, count })).sort((a, b) =>
    a.date.localeCompare(b.date)
  );
}

export async function getAdminOverview(timeframe: AdminTimeframe) {
  const [profiles, artworks, posts, orders] = await Promise.all([
    getAll('profiles'),
    getAll('artworks'),
    getAll('posts'),
    getAll('orders'),
  ]);
  const publicProfiles = profiles.filter(isPublic);
  const publicArtworks = artworks.filter(
    (artwork) => isPublic(artwork) && publicProfiles.some((profile) => profile.id === artwork.artist_id)
  );
  const publicPosts = posts.filter(
    (post) => isPublic(post) && publicProfiles.some((profile) => profile.id === post.author_id)
  );
  const publicOrders = orders.filter(
    (order) => publicProfiles.some((profile) => profile.id === order.buyer_id)
  );
  const activeProfiles = publicProfiles.filter((profile) => profile.account_status === 'active');
  const roles = ['admin', 'artist', 'collector', 'art_lover'] as const;
  const accountStatuses = ['active', 'pending', 'suspended', 'deleted'] as const;
  const chartArtworks = publicArtworks.filter((row) => withinTimeframe(row.created_at, timeframe));
  const chartPosts = publicPosts.filter((row) => withinTimeframe(row.created_at, timeframe));
  const chartOrders = publicOrders.filter((row) => withinTimeframe(row.created_at, timeframe));

  return {
    counts: {
      users: activeProfiles.length,
      artists: activeProfiles.filter((profile) => profile.role === 'artist').length,
      collectors: activeProfiles.filter((profile) => profile.role === 'collector').length,
      artworks: publicArtworks.length,
      communityPosts: publicPosts.length,
      purchaseIntents: publicOrders.length,
      pendingPaymentIntents: publicOrders.filter((order) => order.status === 'awaiting_payment').length,
      createdIntents: publicOrders.filter((order) => order.status === 'intent_created').length,
      cancelledIntents: publicOrders.filter((order) => order.status === 'cancelled').length,
      completedPurchases: null,
    },
    payments: {
      configured: false,
      message: 'Payment integration not configured. Purchase intents are mediated manually.',
      confirmed: 0,
    },
    timeframe,
    series: {
      registrations: series(publicProfiles, 'registration_date', timeframe),
      artworks: series(chartArtworks, 'created_at', timeframe),
      communityPosts: series(chartPosts, 'created_at', timeframe),
      purchaseIntents: series(chartOrders, 'created_at', timeframe).map((point) => ({
        ...point,
        intents: point.count,
        pending: chartOrders.filter(
          (order) =>
            dateBucket(order.created_at, timeframe) === point.date &&
            order.status === 'awaiting_payment'
        ).length,
      })),
      confirmedPayments: [],
      roleDistribution: roles.map((role) => ({
        role,
        count: activeProfiles.filter((profile) => profile.role === role).length,
      })),
      accountStatusDistribution: accountStatuses.map((status) => ({
        status,
        count: publicProfiles.filter((profile) => profile.account_status === status).length,
      })),
    },
  };
}

export async function getAdminUsers(options: {
  page?: unknown;
  pageSize?: unknown;
  role?: AdminRoleFilter;
  accountStatus?: 'active' | 'pending' | 'suspended' | 'deleted' | 'all';
  search?: string;
}) {
  const { page, pageSize, offset } = getPageParams(options.page, options.pageSize);
  const [profiles, artworks, orders] = await Promise.all([
    getAll('profiles'),
    getAll('artworks'),
    getAll('orders'),
  ]);
  const search = options.search?.trim().toLocaleLowerCase().slice(0, 100);
  const records = profiles
    .filter(isPublic)
    .filter((profile) => options.role === 'all' || !options.role || profile.role === options.role)
    .filter(
      (profile) =>
        options.accountStatus === 'all' ||
        !options.accountStatus ||
        profile.account_status === options.accountStatus
    )
    .filter(
      (profile) =>
        !search ||
        [profile.full_name, profile.handle, profile.username]
          .some((value) => String(value || '').toLocaleLowerCase().includes(search))
    )
    .sort(
      (a, b) =>
        new Date(String(b.registration_date)).getTime() -
        new Date(String(a.registration_date)).getTime()
    );
  const pageRecords = records.slice(offset, offset + pageSize);
  return {
    records: pageRecords.map((profile) => {
      const userArtworks = artworks.filter(
        (artwork) => artwork.artist_id === profile.id && isPublic(artwork)
      );
      return {
        profileId: String(profile.id),
        fullName: String(profile.full_name || ''),
        handle: String(profile.handle || ''),
        username: String(profile.username || ''),
        role: String(profile.role || ''),
        accountStatus: String(profile.account_status || ''),
        registrationDate: String(profile.registration_date || ''),
        createdAt: String(profile.registration_date || profile.created_at || ''),
        artworkCount: userArtworks.length,
        availableArtworkCount: userArtworks.filter((artwork) => artwork.availability === 'available').length,
        purchaseIntentCount: orders.filter((order) => order.seller_id === profile.id).length,
      };
    }),
    page,
    pageSize,
    total: records.length,
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
  const search = options.search?.trim().toLocaleLowerCase().slice(0, 100);
  const artistName = options.artistName?.trim().toLocaleLowerCase().slice(0, 100);
  const [profiles, entries] = await Promise.all([
    getAll('profiles'),
    getAll(options.kind === 'community' ? 'posts' : 'artworks'),
  ]);
  const profileById = new Map(profiles.filter(isPublic).map((profile) => [String(profile.id), profile]));
  const records = entries
    .filter(isPublic)
    .map((entry) => {
      const profile = profileById.get(
        String(options.kind === 'community' ? entry.author_id : entry.artist_id)
      );
      if (!profile) return undefined;
      return {
        id: String(entry.id),
        kind: options.kind === 'community' ? 'community' as const : 'artwork' as const,
        title: String(entry.title || ''),
        artistId: String(profile.id),
        artistName: String(profile.full_name || ''),
        artistHandle: String(profile.handle || ''),
        createdAt: String(entry.created_at || ''),
        imageKey: (entry.image_key as string | null) || null,
        artworkId: options.kind === 'community' ? (entry.artwork_id as string | null) || null : null,
        saleMode: options.kind === 'community' ? null : String(entry.sale_mode || ''),
        availability: options.kind === 'community' ? null : String(entry.availability || ''),
        price: options.kind === 'community' ? null : Number(entry.price),
        currency: options.kind === 'community' ? null : String(entry.currency || ''),
      };
    })
    .filter((record): record is NonNullable<typeof record> => Boolean(record))
    .filter(
      (record) =>
        options.kind !== 'artworks' ||
        options.artworkFilter !== 'direct' ||
        record.saleMode !== 'negotiation_only'
    )
    .filter((record) => !artistName || record.artistName.toLocaleLowerCase().includes(artistName))
    .filter(
      (record) =>
        !search ||
        record.title.toLocaleLowerCase().includes(search) ||
        record.artistName.toLocaleLowerCase().includes(search)
    )
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  return {
    records: records.slice(offset, offset + pageSize),
    page,
    pageSize,
    total: records.length,
  };
}

export async function getAdminOrders(options: { page?: unknown; pageSize?: unknown }) {
  const { page, pageSize, offset } = getPageParams(options.page, options.pageSize);
  const [profiles, artworks, orders] = await Promise.all([
    getAll('profiles'),
    getAll('artworks'),
    getAll('orders'),
  ]);
  const profileById = new Map(profiles.filter(isPublic).map((profile) => [String(profile.id), profile]));
  const artworkById = new Map(artworks.map((artwork) => [String(artwork.id), artwork]));
  const records = orders
    .filter((order) => profileById.has(String(order.buyer_id)))
    .sort(
      (a, b) =>
        new Date(String(b.created_at)).getTime() - new Date(String(a.created_at)).getTime()
    );
  return {
    records: records.slice(offset, offset + pageSize).map((order) => ({
      id: String(order.id),
      artworkTitle: String(artworkById.get(String(order.artwork_id))?.title || ''),
      buyerName: String(profileById.get(String(order.buyer_id))?.full_name || ''),
      sellerName: String(profileById.get(String(order.seller_id))?.full_name || ''),
      amount: Number(order.amount),
      currency: String(order.currency || ''),
      status: String(order.status || ''),
      createdAt: String(order.created_at || ''),
    })),
    page,
    pageSize,
    total: records.length,
  };
}
