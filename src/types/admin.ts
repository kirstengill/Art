export type AdminTimeframe = 7 | 30 | 90 | 'all';
export type AdminRoleFilter = 'all' | 'admin' | 'artist' | 'collector' | 'art_lover';
export type AdminContentKind = 'artworks' | 'community';
export type AdminArtworkFilter = 'all' | 'direct';
export type AdminCollectorApprovalFilter = 'all' | 'pending_approval' | 'approved' | 'rejected';

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
    donations: number;
    exhibitions: number;
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
  username: string | null;
  role: string | null;
  accountStatus: string;
  registrationDate: string;
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
  source: 'purchase_request' | 'order_intent';
  artworkId: string;
  artworkTitle: string;
  artworkImage: string | null;
  artistId: string;
  buyerName: string;
  buyerPhone: string;
  buyerEmail: string;
  deliveryLocation: string;
  deliveryAddress: string;
  instructions: string;
  sellerName: string;
  amount: number;
  currency: string;
  status: string;
  createdAt: string;
}

export interface AdminCollectorApprovalRecord {
  profileId: string;
  fullName: string;
  handle: string;
  username: string;
  email: string;
  location: string;
  phoneNumber: string;
  accountStatus: string;
  registrationDate: string;
  createdAt: string;
  collectorApprovedAt: string | null;
  collectorApprovedBy: string | null;
  collectorRejectionReason: string | null;
}
