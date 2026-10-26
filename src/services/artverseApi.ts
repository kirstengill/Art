import { getSupabaseAccessToken } from '../lib/supabase';
import type {
  Artwork,
  ArtworkInput,
  ArtworkOffer,
  CommunityPost,
  Conversation,
  ConversationMessage,
  OrderIntent,
  PostComment,
  Profile,
  UserRole,
} from '../types/artverse';
import type {
  AdminContentKind,
  AdminContentRecord,
  AdminOverview,
  AdminOrderRecord,
  AdminPageResult,
  AdminRoleFilter,
  AdminUserRecord,
  AdminArtworkFilter,
  AdminTimeframe,
} from '../types/admin';

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const token = await getSupabaseAccessToken();
  const headers = new Headers(init?.headers || {});
  headers.set('Content-Type', 'application/json');
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(path, {
    ...init,
    headers,
  });

  if (!response.ok) {
    let errText = 'Request failed.';
    try {
      const data = await response.json();
      if (data?.error) errText = data.error;
    } catch {
      // ignore json parse failure
    }
    throw new Error(errText);
  }

  return response.json() as Promise<T>;
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

export const artverseApi = {
  fetchCatalog: () => apiFetch<CatalogResponse>('/api/catalog'),

  syncProfile: (payload: {
    fullName?: string;
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
};
