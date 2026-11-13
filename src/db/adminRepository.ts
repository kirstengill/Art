import { getSupabaseServiceClient } from '../lib/supabase-server.ts';
import type {
  AdminArtworkFilter,
  AdminCollectorApprovalFilter,
  AdminContentKind,
  AdminRoleFilter,
  AdminTimeframe,
} from '../types/admin.js';

export type {
  AdminArtworkFilter,
  AdminContentKind,
  AdminRoleFilter,
  AdminTimeframe,
} from '../types/admin';

type Row = Record<string, unknown>;

let missingPurchaseRequestsWarningLogged = false;

async function getAll(table: string, missingTableIsOptional = false): Promise<Row[]> {
  const db = getSupabaseServiceClient();
  const result: Row[] = [];
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await db
      .from(table)
      .select('*')
      .range(offset, offset + 999);
    if (error) {
      if (missingTableIsOptional && error.code === 'PGRST205') {
        if (table === 'purchase_requests' && !missingPurchaseRequestsWarningLogged) {
          console.warn('Admin purchase requests are unavailable until the purchase_requests migration is applied.');
          missingPurchaseRequestsWarningLogged = true;
        }
        return result;
      }
      throw new Error(`Unable to query ${table} (${error.code}): ${error.message}`);
    }
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
  const [profiles, artworks, posts, orders, purchaseRequests, donations, exhibitions] = await Promise.all([
    getAll('profiles'),
    getAll('artworks'),
    getAll('posts'),
    getAll('orders'),
    getAll('purchase_requests', true),
    getAll('donations', true),
    getAll('exhibitions', true),
  ]);
  const publicProfiles = profiles.filter(isPublic);
  const publicArtworks = artworks.filter(
    (artwork) => isPublic(artwork) && publicProfiles.some((profile) => profile.id === artwork.artist_id)
  );
  const publicPosts = posts.filter(
    (post) => isPublic(post) && publicProfiles.some((profile) => profile.id === post.author_id)
  );
  const publicOrders = orders.filter(
    (order) =>
      order.buyer_id == null ||
      publicProfiles.some((profile) => profile.id === order.buyer_id)
  ).concat(purchaseRequests);
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
      pendingPaymentIntents: publicOrders.filter(
        (order) =>
          order.status === 'intent_created' ||
          order.status === 'awaiting_payment' ||
          order.status === 'pending' ||
          order.status === 'confirmed'
      ).length,
      createdIntents: publicOrders.filter((order) => order.status === 'intent_created').length,
      cancelledIntents: publicOrders.filter((order) => order.status === 'cancelled').length,
      completedPurchases: null,
      donations: donations.length,
      exhibitions: exhibitions.length,
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
  const [profiles, artworks, orders, purchaseRequests] = await Promise.all([
    getAll('profiles'),
    getAll('artworks'),
    getAll('orders'),
    getAll('purchase_requests', true),
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
        new Date(String(b.registration_date || b.created_at)).getTime() -
        new Date(String(a.registration_date || a.created_at)).getTime()
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
        registrationDate: String(profile.registration_date || profile.created_at || ''),
        createdAt: String(profile.registration_date || profile.created_at || ''),
        artworkCount: userArtworks.length,
        availableArtworkCount: userArtworks.filter((artwork) => artwork.availability === 'available').length,
        purchaseIntentCount:
          orders.filter((order) => order.seller_id === profile.id).length +
          purchaseRequests.filter((request) => request.artist_id === profile.id).length,
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
  const profileById = new Map(
    profiles
      .filter((profile) => options.kind === 'artworks' || isPublic(profile))
      .map((profile) => [String(profile.id), profile])
  );
  const records = entries
    .filter((entry) => options.kind === 'artworks' || isPublic(entry))
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
  const [profiles, artworks, orders, purchases] = await Promise.all([
    getAll('profiles'),
    getAll('artworks'),
    getAll('orders'),
    getAll('purchases'),
  ]);
  const profileById = new Map(profiles.filter(isPublic).map((profile) => [String(profile.id), profile]));
  const artworkById = new Map(artworks.map((artwork) => [String(artwork.id), artwork]));
  const purchaseOrderIds = new Set(
    purchases
      .filter((purchase) => purchase.purchase_request_id)
      .map((purchase) => String(purchase.order_id))
  );
  const records: Array<Row & { source: 'order_intent' }> = orders
    .filter((order) => !purchaseOrderIds.has(String(order.id)))
    .filter((order) => profileById.has(String(order.buyer_id)))
    .map((order): Row & { source: 'order_intent' } => ({ ...order, source: 'order_intent' }))
    .sort(
      (a, b) =>
        new Date(String(b.created_at)).getTime() - new Date(String(a.created_at)).getTime()
    );
  return {
    records: records.slice(offset, offset + pageSize).map((order) => ({
      id: String(order.id),
      source: order.source,
      artworkId: typeof order.artwork_id === 'string' ? order.artwork_id : null,
      artworkTitle: String(
        order.artwork_title ||
          order.artwork_title_snapshot ||
          artworkById.get(String(order.artwork_id))?.title ||
          ''
      ),
      artworkImage: String(
        order.artwork_image ||
          order.artwork_image_snapshot ||
          artworkById.get(String(order.artwork_id))?.image_key ||
          ''
      ) || null,
      artistId: String(order.artist_id || order.seller_id),
      buyerName: String(
        order.buyer_name || profileById.get(String(order.buyer_id))?.full_name || ''
      ),
      buyerPhone: String(order.buyer_phone || ''),
      buyerEmail: String(order.buyer_email || profileById.get(String(order.buyer_id))?.email || ''),
      deliveryLocation: String(order.delivery_location || order.shipping_city || ''),
      deliveryAddress: String(order.delivery_address || ''),
      instructions: String(order.instructions || order.buyer_instructions || order.collector_note || ''),
      sellerName: String(
        order.artist_name ||
          order.artist_name_snapshot ||
          profileById.get(String(order.artist_id || order.seller_id))?.full_name ||
          ''
      ),
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

export async function getAdminPurchaseRequests(options: { page?: unknown; pageSize?: unknown }) {
  const { page, pageSize, offset } = getPageParams(options.page, options.pageSize);
  const [profiles, artworks, requests, purchases, orders] = await Promise.all([
    getAll('profiles'),
    getAll('artworks'),
    getAll('purchase_requests', true),
    getAll('purchases'),
    getAll('orders'),
  ]);
  const profileById = new Map(profiles.map((profile) => [String(profile.id), profile]));
  const artworkById = new Map(artworks.map((artwork) => [String(artwork.id), artwork]));
  const purchaseByRequestId = new Map(
    purchases
      .filter((purchase) => purchase.purchase_request_id)
      .map((purchase) => [String(purchase.purchase_request_id), purchase])
  );
  const orderById = new Map(orders.map((order) => [String(order.id), order]));
  const records = requests.sort(
    (a, b) =>
      new Date(String(b.created_at)).getTime() - new Date(String(a.created_at)).getTime()
  );

  return {
    records: records.slice(offset, offset + pageSize).map((request) => {
      const artwork = artworkById.get(String(request.artwork_id));
      const purchase = purchaseByRequestId.get(String(request.id));
      const order = purchase ? orderById.get(String(purchase.order_id)) : undefined;
      const artist = profileById.get(String(request.artist_id));
      return {
        id: String(request.id),
        artworkId: typeof request.artwork_id === 'string' ? request.artwork_id : null,
        artworkTitle: String(request.artwork_title || artwork?.title || ''),
        artworkImage: String(request.artwork_image || artwork?.image_key || '') || null,
        artistId: String(request.artist_id || ''),
        artistName: String(request.artist_name || artist?.full_name || ''),
        collectorId: typeof request.collector_id === 'string' ? request.collector_id : null,
        buyerName: String(request.buyer_name || ''),
        buyerPhone: String(request.buyer_phone || ''),
        buyerEmail: String(request.buyer_email || ''),
        deliveryLocation: String(request.delivery_location || ''),
        deliveryAddress: String(request.delivery_address || ''),
        instructions: String(request.instructions || ''),
        amount: Number(request.amount),
        currency: String(request.currency || ''),
        status: String(request.status || ''),
        createdAt: String(request.created_at || ''),
        adminDecidedAt: typeof request.admin_decided_at === 'string' ? request.admin_decided_at : null,
        paymentStatus: typeof purchase?.payment_status === 'string' ? purchase.payment_status : null,
        paymentConfirmedAt: typeof purchase?.payment_confirmed_at === 'string' ? purchase.payment_confirmed_at : null,
        deliveryStatus: typeof purchase?.delivery_status === 'string' ? purchase.delivery_status : null,
        deliveryConfirmedAt: typeof purchase?.delivery_confirmed_at === 'string' ? purchase.delivery_confirmed_at : null,
        orderStatus: typeof order?.status === 'string' ? order.status : null,
      };
    }),
    page,
    pageSize,
    total: records.length,
  };
}

const ORDER_STATUS_TRANSITIONS: Record<string, string[]> = {
  intent_created: ['awaiting_payment', 'cancelled'],
  awaiting_payment: ['cancelled'],
  pending: ['confirmed', 'cancelled'],
  confirmed: ['paid', 'cancelled'],
  paid: ['delivered'],
  delivered: ['completed'],
  completed: [],
  cancelled: [],
};

export async function updateAdminOrderStatus(
  orderId: string,
  nextStatus: string
) {
  if (!Object.hasOwn(ORDER_STATUS_TRANSITIONS, nextStatus)) {
    throw new Error('Invalid purchase request status.');
  }
  const db = getSupabaseServiceClient();
  const { data: current, error: currentError } = await db
    .from('orders')
    .select('id,status,purchase_request_id')
    .eq('id', orderId)
    .maybeSingle();
  if (currentError) throw new Error(`Unable to load purchase request: ${currentError.message}`);
  if (!current) throw new Error('Purchase request not found.');
  if (current.purchase_request_id) {
    throw new Error('Approved purchase requests must be managed from the Purchase Requests section.');
  }
  if (!ORDER_STATUS_TRANSITIONS[String(current.status)]?.includes(nextStatus)) {
    throw new Error(`A purchase request cannot move from ${String(current.status)} to ${nextStatus}.`);
  }

  const { data, error } = await db
    .from('orders')
    .update({ status: nextStatus })
    .eq('id', orderId)
    .select('id,status')
    .single();
  if (error) throw new Error(`Unable to update purchase request: ${error.message}`);
  return { id: String(data.id), status: String(data.status) };
}

export async function getAdminCollectorApprovals(options: {
  page?: unknown;
  pageSize?: unknown;
  filter?: AdminCollectorApprovalFilter;
  search?: string;
}) {
  const { page, pageSize, offset } = getPageParams(options.page, options.pageSize);
  const db = getSupabaseServiceClient();
  const search = options.search?.trim().toLocaleLowerCase().slice(0, 100);

  let query = db.from('profiles').select('*').eq('role', 'collector');
  if (options.filter === 'pending_approval') {
    query = query.eq('account_status', 'pending');
  } else if (options.filter === 'approved') {
    query = query.eq('account_status', 'active').not('collector_approved_at', 'is', null);
  } else if (options.filter === 'rejected') {
    query = query.eq('account_status', 'rejected');
  }

  const { data: allRows, error } = await query;
  if (error) throw new Error(`Unable to load collector approvals: ${error.message}`);

  let records = (allRows as Row[]).filter((row) => {
    if (!search) return true;
    const haystack = [
      String(row.full_name || ''),
      String(row.handle || ''),
      String(row.username || ''),
      String(row.email || ''),
    ]
      .join(' ')
      .toLocaleLowerCase();
    return haystack.includes(search);
  });

  records.sort(
    (a, b) =>
      new Date(String(b.created_at || b.registration_date)).getTime() -
      new Date(String(a.created_at || a.registration_date)).getTime()
  );

  const pageRecords = records.slice(offset, offset + pageSize);
  return {
    records: pageRecords.map((row) => ({
      profileId: String(row.id),
      fullName: String(row.full_name || ''),
      handle: String(row.handle || ''),
      username: String(row.username || ''),
      email: String(row.email || ''),
      location: String(row.location || ''),
      phoneNumber: String(row.phone_number || ''),
      accountStatus: String(row.account_status || ''),
      registrationDate: String(row.registration_date || row.created_at || ''),
      createdAt: String(row.created_at || ''),
      collectorApprovedAt: row.collector_approved_at ? String(row.collector_approved_at) : null,
      collectorApprovedBy: row.collector_approved_by ? String(row.collector_approved_by) : null,
      collectorRejectionReason: row.collector_rejection_reason
        ? String(row.collector_rejection_reason)
        : null,
    })),
    page,
    pageSize,
    total: records.length,
  };
}

export async function updateAdminCollectorApproval(
  profileId: string,
  action: 'approve' | 'reject',
  rejectionReason?: string
) {
  const db = getSupabaseServiceClient();
  const { data: current, error: currentError } = await db
    .from('profiles')
    .select('id, role, account_status, collector_approved_at')
    .eq('id', profileId)
    .maybeSingle();
  if (currentError) throw new Error(`Unable to load profile: ${currentError.message}`);
  if (!current) throw new Error('Collector profile not found.');
  if (String(current.role) !== 'collector') {
    throw new Error('Only collector accounts can be approved or rejected.');
  }

  const now = new Date().toISOString();
  const updates: Record<string, unknown> = { updated_at: now };

  if (action === 'approve') {
    updates.account_status = 'active';
    updates.collector_approved_at = now;
    updates.collector_approved_by = null;
    updates.collector_rejection_reason = null;
  } else {
    updates.account_status = 'rejected';
    updates.collector_approved_at = null;
    updates.collector_approved_by = null;
    updates.collector_rejection_reason = rejectionReason || null;
  }

  const { data, error } = await db
    .from('profiles')
    .update(updates)
    .eq('id', profileId)
    .select('id, account_status, collector_approved_at')
    .single();
  if (error) throw new Error(`Unable to update collector approval: ${error.message}`);
  return {
    id: String(data.id),
    accountStatus: String(data.account_status),
    collectorApprovedAt: data.collector_approved_at ? String(data.collector_approved_at) : null,
  };
}
