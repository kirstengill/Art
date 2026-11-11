import { getSupabaseAccessToken } from '../lib/supabase';
import type {
  Artwork,
  ArtworkInput,
  ArtworkOffer,
  ArtistProfile,
  CommunityPost,
  Conversation,
  ConversationMessage,
  Donation,
  DonationInput,
  Exhibition,
  ExhibitionInput,
  ExhibitionStatus,
  ExhibitionSubmission,
  ExhibitionSubmissionInput,
  OrderIntent,
  PurchaseRequestReceipt,
  PostComment,
  Profile,
  Purchase,
  UserRole,
} from '../types/artverse';
import type {
  AdminArtworkFilter,
  AdminCollectorApprovalFilter,
  AdminCollectorApprovalRecord,
  AdminContentKind,
  AdminContentRecord,
  AdminOverview,
  AdminOrderRecord,
  AdminPageResult,
  AdminRoleFilter,
  AdminTimeframe,
  AdminUserRecord,
} from '../types/admin';
import type { PurchaseRequestInput } from '../utils/purchaseRequests';
import {
  reportNetworkIssue,
  reportNetworkRecovery,
  trackApiRequest,
} from '../utils/networkStatus';

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const token = await getSupabaseAccessToken();
  const headers = new Headers(init?.headers || {});
  headers.set('Content-Type', 'application/json');
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const finishTracking = trackApiRequest();
  let receivedResponse = false;
  try {
    const response = await fetch(path, {
      ...init,
      headers,
    });
    receivedResponse = true;

    if (!response.ok) {
      let errText = `Request failed (${response.status}) for ${path}.`;
      try {
        const data = await response.json();
        if (data?.error) errText = `${data.error} (${response.status}) for ${path}.`;
      } catch {
        // ignore json parse failure, errText already includes status and path
      }
      throw new Error(errText);
    }

    return await response.json() as T;
  } catch (error) {
    if (!receivedResponse) reportNetworkIssue();
    throw error;
  } finally {
    finishTracking();
    if (receivedResponse) reportNetworkRecovery();
  }
}

export interface CatalogResponse {
  profiles: Profile[];
  artworks: Artwork[];
  posts: CommunityPost[];
  comments: PostComment[];
  followedArtistIds: string[];
  likedPostIds: string[];
  savedArtworkIds: string[];
}

export interface ArtistsResponse {
  artists: ArtistProfile[];
}

export const artverseApi = {
  fetchCatalog: () => apiFetch<CatalogResponse>('/api/catalog'),
  fetchArtists: () => apiFetch<ArtistsResponse>('/api/artists'),

  syncProfile: (payload: {
    fullName?: string;
    firstName?: string;
    lastName?: string;
    phoneNumber?: string;
    role?: UserRole;
    bio?: string;
    location?: string;
  }) =>
    apiFetch<{ profile: Profile }>('/api/auth/sync', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  saveArtwork: (input: ArtworkInput) =>
    apiFetch<{ artwork: Artwork }>(
      input.id ? `/api/artworks/${input.id}` : '/api/artworks',
      {
        method: input.id ? 'PUT' : 'POST',
        body: JSON.stringify(input),
      }
    ),

  deleteArtwork: (artworkId: string) =>
    apiFetch<{ deletedId: string }>(`/api/artworks/${artworkId}`, {
      method: 'DELETE',
    }),

  toggleBookmark: (artworkId: string) =>
    apiFetch<{ saved: boolean }>(`/api/artworks/${artworkId}/save`, {
      method: 'POST',
    }),

  toggleFollow: (artistId: string) =>
    apiFetch<{ following: boolean }>(`/api/artists/${artistId}/follow`, {
      method: 'POST',
    }),

  createPost: (payload: {
    title: string;
    body: string;
    artworkId?: string;
    imageKey?: string;
  }) =>
    apiFetch<{ post: CommunityPost }>('/api/posts', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  addComment: (postId: string, body: string) =>
    apiFetch<{ comment: PostComment }>(`/api/posts/${postId}/comments`, {
      method: 'POST',
      body: JSON.stringify({ body }),
    }),

  togglePostLike: (postId: string) =>
    apiFetch<{ liked: boolean; likesCount: number }>(`/api/posts/${postId}/like`, {
      method: 'POST',
    }),

  fetchConversations: () =>
    apiFetch<{
      conversations: Conversation[];
      messages: ConversationMessage[];
      offers: ArtworkOffer[];
    }>('/api/conversations'),

  openConversation: (artworkId: string) =>
    apiFetch<{ conversation: Conversation }>('/api/conversations/open', {
      method: 'POST',
      body: JSON.stringify({ artworkId }),
    }),

  sendMessage: (conversationId: string, body: string, attachmentName?: string) =>
    apiFetch<{ message: ConversationMessage }>(
      `/api/conversations/${conversationId}/messages`,
      {
        method: 'POST',
        body: JSON.stringify({ body, attachmentName }),
      }
    ),

  submitOffer: (
    conversationId: string,
    payload: { amount: number; currency: string; note: string }
  ) =>
    apiFetch<{ offer: ArtworkOffer }>(`/api/conversations/${conversationId}/offers`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  respondToOffer: (
    offerId: string,
    payload: {
      action: 'accept' | 'reject' | 'withdraw' | 'counter';
      counterAmount?: number;
      note?: string;
    }
  ) =>
    apiFetch<{ updatedOffer: ArtworkOffer; counterOffer: ArtworkOffer | null }>(
      `/api/offers/${offerId}/respond`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      }
    ),

  createOrderIntent: (payload: {
    artworkId: string;
    offerId?: string;
    shippingCity: string;
    collectorNote: string;
  }) =>
    apiFetch<{ order: OrderIntent }>('/api/orders/intent', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  createPurchaseRequest: (payload: PurchaseRequestInput) =>
    apiFetch<{ order: PurchaseRequestReceipt }>('/api/purchase-requests', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  fetchAdminOverview: (timeframe: AdminTimeframe) =>
    apiFetch<AdminOverview>(
      `/api/admin/overview?timeframe=${encodeURIComponent(timeframe)}`
    ),

  fetchAdminUsers: (options: {
    page: number;
    pageSize: number;
    role: AdminRoleFilter;
    search: string;
  }) => {
    const params = new URLSearchParams({
      page: String(options.page),
      pageSize: String(options.pageSize),
      role: options.role,
      search: options.search,
    });
    return apiFetch<AdminPageResult<AdminUserRecord>>(`/api/admin/users?${params}`);
  },

  fetchAdminContent: (options: {
    kind: AdminContentKind;
    page: number;
    pageSize: number;
    search: string;
    artistName: string;
    filter: AdminArtworkFilter;
  }) => {
    const params = new URLSearchParams({
      kind: options.kind,
      page: String(options.page),
      pageSize: String(options.pageSize),
      search: options.search,
      artistName: options.artistName,
      filter: options.filter,
    });
    return apiFetch<AdminPageResult<AdminContentRecord>>(`/api/admin/content?${params}`);
  },

  fetchAdminOrders: (page: number, pageSize: number) => {
    const params = new URLSearchParams({
      page: String(page),
      pageSize: String(pageSize),
    });
    return apiFetch<AdminPageResult<AdminOrderRecord>>(`/api/admin/orders?${params}`);
  },

  updateAdminOrderStatus: (
    orderId: string,
    source: AdminOrderRecord['source'],
    status: string
  ) =>
    apiFetch<{ id: string; status: string }>(`/api/admin/orders/${encodeURIComponent(orderId)}`, {
      method: 'PATCH',
      body: JSON.stringify({ source, status }),
    }),

  fetchAdminCollectorApprovals: (options: {
    page: number;
    pageSize: number;
    filter: AdminCollectorApprovalFilter;
    search: string;
  }) => {
    const params = new URLSearchParams({
      page: String(options.page),
      pageSize: String(options.pageSize),
      filter: options.filter,
      search: options.search,
    });
    return apiFetch<AdminPageResult<AdminCollectorApprovalRecord>>(`/api/admin/collector-approvals?${params}`);
  },

  updateCollectorApproval: (
    profileId: string,
    action: 'approve' | 'reject',
    rejectionReason?: string
  ) =>
    apiFetch<{ id: string; accountStatus: string; collectorApprovedAt: string | null }>(
      `/api/admin/collector-approvals/${encodeURIComponent(profileId)}`,
      {
        method: 'PATCH',
        body: JSON.stringify({ action, rejectionReason }),
      }
    ),

  // Purchase-related endpoints
  fetchPurchases: () =>
    apiFetch<{ purchases: Purchase[]; artworks: Artwork[] }>('/api/purchases'),

  checkPurchase: (artworkId: string) =>
    apiFetch<{ isPurchased: boolean }>(`/api/purchases/check/${artworkId}`),

  fetchPurchasedArtworkIds: () =>
    apiFetch<{ artworkIds: string[] }>('/api/purchases/artwork-ids'),

  // ============================================
  // Donations
  // ============================================
  createDonation: (payload: DonationInput) =>
    apiFetch<{ donation: Donation }>('/api/donations', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  fetchDonations: () =>
    apiFetch<{ donations: Donation[] }>('/api/donations'),

  fetchDonationsForArtist: (artistId: string) =>
    apiFetch<{ donations: Donation[] }>(`/api/donations/artist/${encodeURIComponent(artistId)}`),

  fetchAdminDonations: () =>
    apiFetch<{ donations: Donation[] }>('/api/admin/donations'),

  // ============================================
  // Exhibitions
  // ============================================
  fetchExhibitions: (status?: ExhibitionStatus) => {
    const params = new URLSearchParams();
    if (status) params.set('status', status);
    return apiFetch<{ exhibitions: Exhibition[] }>(`/api/exhibitions?${params}`);
  },

  fetchExhibition: (exhibitionId: string) =>
    apiFetch<{ exhibition: Exhibition }>(`/api/exhibitions/${encodeURIComponent(exhibitionId)}`),

  createExhibition: (payload: ExhibitionInput) =>
    apiFetch<{ exhibition: Exhibition }>('/api/exhibitions', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  updateExhibition: (exhibitionId: string, payload: Partial<ExhibitionInput>) =>
    apiFetch<{ exhibition: Exhibition }>(`/api/exhibitions/${encodeURIComponent(exhibitionId)}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),

  deleteExhibition: (exhibitionId: string) =>
    apiFetch<{ deletedId: string }>(`/api/exhibitions/${encodeURIComponent(exhibitionId)}`, {
      method: 'DELETE',
    }),

  fetchExhibitionArtworks: (exhibitionId: string) =>
    apiFetch<{ artworks: any[] }>(`/api/exhibitions/${encodeURIComponent(exhibitionId)}/artworks`),

  addArtworkToExhibition: (exhibitionId: string, artworkId: string) =>
    apiFetch<{ result: any }>(`/api/exhibitions/${encodeURIComponent(exhibitionId)}/artworks`, {
      method: 'POST',
      body: JSON.stringify({ artworkId }),
    }),

  removeArtworkFromExhibition: (exhibitionId: string, artworkId: string) =>
    apiFetch<{ removed: boolean }>(
      `/api/exhibitions/${encodeURIComponent(exhibitionId)}/artworks/${encodeURIComponent(artworkId)}`,
      { method: 'DELETE' }
    ),

  createExhibitionSubmission: (payload: ExhibitionSubmissionInput) =>
    apiFetch<{ submission: ExhibitionSubmission }>('/api/exhibitions/submissions', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  fetchExhibitionSubmissions: (exhibitionId: string) =>
    apiFetch<{ submissions: ExhibitionSubmission[] }>(
      `/api/exhibitions/${encodeURIComponent(exhibitionId)}/submissions`
    ),

  updateExhibitionSubmission: (submissionId: string, status: string, notes?: string) =>
    apiFetch<{ submission: ExhibitionSubmission }>(
      `/api/exhibitions/submissions/${encodeURIComponent(submissionId)}`,
      {
        method: 'PATCH',
        body: JSON.stringify({ status, notes }),
      }
    ),
};
