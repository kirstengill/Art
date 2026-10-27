export type AdminTimeframe = 7 | 30 | 90 | 'all';
export type AdminRoleFilter = 'all' | 'admin' | 'artist' | 'collector' | 'art_lover';
export type AdminContentKind = 'artworks' | 'community';
export type AdminArtworkFilter = 'all' | 'direct';

export interface AdminSeriesPoint {
  date: string;
  count: number;
}

export interface AdminOverview {
  counts: {
    users: number;
    artists: number;
    collectors: number;
    artworks: number;
    communityPosts: number;
    purchaseIntents: number;
    pendingPaymentIntents: number;
    createdIntents: number;
    cancelledIntents: number;
    completedPurchases: null;
  };
  payments: {
    configured: boolean;
    message: string;
    confirmed: number;
  };
  timeframe: AdminTimeframe;
  series: {
    registrations: AdminSeriesPoint[];
    artworks: AdminSeriesPoint[];
    communityPosts: AdminSeriesPoint[];
    purchaseIntents: Array<AdminSeriesPoint & { intents: number; pending: number }>;
    confirmedPayments: AdminSeriesPoint[];
    roleDistribution: Array<{ role: 'admin' | 'artist' | 'collector' | 'art_lover'; count: number }>;
  };
}

export interface AdminPageResult<T> {
  records: T[];
  page: number;
  pageSize: number;
  total: number;
}

export interface AdminUserRecord {
  profileId: string | null;
  fullName: string | null;
  handle: string | null;
  role: string | null;
  createdAt: string;
  artworkCount: number;
  availableArtworkCount: number;
  purchaseIntentCount: number;
}

export interface AdminContentRecord {
  id: string;
  kind: 'artwork' | 'community';
  title: string;
  artistId: string;
  artistName: string;
  artistHandle: string;
  createdAt: string;
  imageKey: string | null;
  artworkId: string | null;
  saleMode: string | null;
  availability: string | null;
  price: number | null;
  currency: string | null;
}

export interface AdminOrderRecord {
  id: string;
  artworkTitle: string;
  buyerName: string;
  sellerName: string;
  amount: number;
  currency: string;
  status: string;
  createdAt: string;
}
