import type { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
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
  PurchaseRequest,
  PurchaseRequestReceipt,
  PostComment,
  Profile,
  Purchase,
  UserNotification,
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
  AdminPurchaseRequestRecord,
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

type ApiRequestInit = Omit<RequestInit, 'body'> & { body?: unknown };

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number | null,
    readonly code: string,
    readonly path: string,
    readonly details?: unknown,
    options?: ErrorOptions
  ) {
    super(message, options);
    this.name = 'ApiError';
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

export class ApiClient {
  private session: Session | null = null;
  private readonly baseUrl = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/+$/, '');

  setSession(session: Session | null): void {
    this.session = session;
  }

  async getToken(): Promise<string | null> {
    const session = await this.refreshSession();
    return session?.access_token ?? null;
  }

  async getUserId(): Promise<string | null> {
    const session = await this.refreshSession();
    return session?.user.id ?? null;
  }

  async getHeaders(headers?: HeadersInit): Promise<Headers> {
    const result = new Headers(headers);
    result.set('Content-Type', 'application/json');
    const token = await this.getToken();
    if (token) {
      result.set('Authorization', `Bearer ${token}`);
    } else {
      result.delete('Authorization');
    }
    return result;
  }

  async request<T>(path: string, init: ApiRequestInit = {}): Promise<T> {
    const { body, ...requestOptions } = init;
    const headers = await this.getHeaders(requestOptions.headers);
    const url = `${this.baseUrl}${path}`;
    const finishTracking = trackApiRequest();
    let receivedResponse = false;

    try {
      const response = await fetch(url, {
        ...requestOptions,
        headers,
        ...(body === undefined
          ? {}
          : { body: typeof body === 'string' ? body : JSON.stringify(body) }),
      });
      receivedResponse = true;
      const responseText = await response.text();

      if (!response.ok) {
        let responseBody: unknown;
        if (responseText) {
          try {
            responseBody = JSON.parse(responseText);
          } catch (error) {
            responseBody = {
              raw: responseText,
              parseError: error instanceof Error ? error.message : String(error),
            };
          }
        }
        const errorBody =
          responseBody && typeof responseBody === 'object'
            ? responseBody as Record<string, unknown>
            : undefined;
        const message = typeof errorBody?.error === 'string'
          ? `${errorBody.error} (${response.status}) for ${path}.`
          : `Request failed (${response.status}) for ${path}.`;
        const code = typeof errorBody?.code === 'string' ? errorBody.code : 'HTTP_ERROR';
        throw new ApiError(
          message,
          response.status,
          code,
          path,
          responseBody
        );
      }

      try {
        return JSON.parse(responseText) as T;
      } catch (error) {
        throw new ApiError(
          `Invalid JSON response from ${path}.`,
          response.status,
          'INVALID_RESPONSE',
          path,
          { raw: responseText },
          { cause: error }
        );
      }
    } catch (error) {
      if (error instanceof ApiError) throw error;
      if (!receivedResponse) {
        reportNetworkIssue();
        const reason = error instanceof Error ? error.message : String(error);
        throw new ApiError(
          `Network request to ${path} failed before receiving a response: ${reason}`,
          null,
          'NETWORK_ERROR',
          path,
          undefined,
          { cause: error }
        );
      }
      const reason = error instanceof Error ? error.message : String(error);
      throw new ApiError(
        `Unable to read the response from ${path}: ${reason}`,
        null,
        'INVALID_RESPONSE',
        path,
        undefined,
        { cause: error }
      );
    } finally {
      finishTracking();
      if (receivedResponse) reportNetworkRecovery();
    }
  }

  private async refreshSession(): Promise<Session | null> {
    if (!supabase) {
      this.setSession(null);
      return null;
    }
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      throw new ApiError(
        error.message,
        null,
        'AUTH_ERROR',
        '/auth/session',
        undefined,
        { cause: error }
      );
    }
    this.setSession(data.session);
    return this.session;
  }

  // Authentication and user profiles
  syncProfile(payload: {
    fullName?: string;
    firstName?: string;
    lastName?: string;
    phoneNumber?: string;
    role?: UserRole;
    bio?: string;
    location?: string;
  }): Promise<{ profile: Profile }> {
    return this.request('/api/auth/sync', { method: 'POST', body: payload });
  }

  // Artists and artwork
  fetchCatalog(): Promise<CatalogResponse> {
    return this.request('/api/catalog', { cache: 'no-store' });
  }

  fetchArtists(): Promise<ArtistsResponse> {
    return this.request('/api/artists');
  }

  saveArtwork(input: ArtworkInput): Promise<{ artwork: Artwork }> {
    return this.request(
      input.id ? `/api/artworks/${input.id}` : '/api/artworks',
      { method: input.id ? 'PUT' : 'POST', body: input }
    );
  }

  deleteArtwork(artworkId: string): Promise<{ deletedId: string }> {
    return this.request(`/api/artworks/${artworkId}`, { method: 'DELETE' });
  }

  toggleBookmark(artworkId: string): Promise<{ saved: boolean }> {
    return this.request(`/api/artworks/${artworkId}/save`, { method: 'POST' });
  }

  toggleFollow(artistId: string): Promise<{ following: boolean }> {
    return this.request(`/api/artists/${artistId}/follow`, { method: 'POST' });
  }

  // Posts and comments
  createPost(payload: {
    title: string;
    body: string;
    artworkId?: string;
    imageKey?: string;
  }): Promise<{ post: CommunityPost }> {
    return this.request('/api/posts', { method: 'POST', body: payload });
  }

  addComment(postId: string, body: string): Promise<{ comment: PostComment }> {
    return this.request(`/api/posts/${postId}/comments`, {
      method: 'POST',
      body: { body },
    });
  }

  togglePostLike(postId: string): Promise<{ liked: boolean; likesCount: number }> {
    return this.request(`/api/posts/${postId}/like`, { method: 'POST' });
  }

  // Conversations and offers
  fetchConversations(): Promise<{
    conversations: Conversation[];
    messages: ConversationMessage[];
    offers: ArtworkOffer[];
  }> {
    return this.request('/api/conversations');
  }

  openConversation(artworkId: string): Promise<{ conversation: Conversation }> {
    return this.request('/api/conversations/open', {
      method: 'POST',
      body: { artworkId },
    });
  }

  sendMessage(
    conversationId: string,
    body: string,
    attachmentName?: string
  ): Promise<{ message: ConversationMessage }> {
    return this.request(`/api/conversations/${conversationId}/messages`, {
      method: 'POST',
      body: { body, attachmentName },
    });
  }

  submitOffer(
    conversationId: string,
    payload: { amount: number; currency: string; note: string }
  ): Promise<{ offer: ArtworkOffer }> {
    return this.request(`/api/conversations/${conversationId}/offers`, {
      method: 'POST',
      body: payload,
    });
  }

  respondToOffer(
    offerId: string,
    payload: {
      action: 'accept' | 'reject' | 'withdraw' | 'counter';
      counterAmount?: number;
      note?: string;
    }
  ): Promise<{ updatedOffer: ArtworkOffer; counterOffer: ArtworkOffer | null }> {
    return this.request(`/api/offers/${offerId}/respond`, {
      method: 'POST',
      body: payload,
    });
  }

  // Orders and purchase requests
  createOrderIntent(payload: {
    artworkId: string;
    offerId?: string;
    shippingCity: string;
    collectorNote: string;
  }): Promise<{ order: OrderIntent }> {
    return this.request('/api/orders/intent', { method: 'POST', body: payload });
  }

  createPurchaseRequest(payload: PurchaseRequestInput): Promise<{ order: PurchaseRequestReceipt }> {
    return this.request('/api/purchase-requests', { method: 'POST', body: payload });
  }

  fetchPurchaseRequests(): Promise<{ requests: PurchaseRequest[] }> {
    return this.request('/api/purchase-requests', { cache: 'no-store' });
  }

  // Notifications
  fetchNotifications(): Promise<{ notifications: UserNotification[] }> {
    return this.request('/api/notifications', { cache: 'no-store' });
  }

  markNotificationRead(notificationId: string): Promise<{ notification: UserNotification }> {
    return this.request(`/api/notifications/${encodeURIComponent(notificationId)}/read`, {
      method: 'PATCH',
    });
  }

  // Administration
  fetchAdminOverview(timeframe: AdminTimeframe): Promise<AdminOverview> {
    return this.request(`/api/admin/overview?timeframe=${encodeURIComponent(timeframe)}`);
  }

  fetchAdminUsers(options: {
    page: number;
    pageSize: number;
    role: AdminRoleFilter;
    search: string;
  }): Promise<AdminPageResult<AdminUserRecord>> {
    const params = new URLSearchParams({
      page: String(options.page),
      pageSize: String(options.pageSize),
      role: options.role,
      search: options.search,
    });
    return this.request(`/api/admin/users?${params}`);
  }

  fetchAdminContent(options: {
    kind: AdminContentKind;
    page: number;
    pageSize: number;
    search: string;
    artistName: string;
    filter: AdminArtworkFilter;
  }): Promise<AdminPageResult<AdminContentRecord>> {
    const params = new URLSearchParams({
      kind: options.kind,
      page: String(options.page),
      pageSize: String(options.pageSize),
      search: options.search,
      artistName: options.artistName,
      filter: options.filter,
    });
    return this.request(`/api/admin/content?${params}`);
  }

  fetchAdminOrders(page: number, pageSize: number): Promise<AdminPageResult<AdminOrderRecord>> {
    const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
    return this.request(`/api/admin/orders?${params}`);
  }

  updateAdminOrderStatus(orderId: string, status: string): Promise<{ id: string; status: string }> {
    return this.request(`/api/admin/orders/${encodeURIComponent(orderId)}`, {
      method: 'PATCH',
      body: { status },
    });
  }

  fetchAdminPurchaseRequests(
    page: number,
    pageSize: number
  ): Promise<AdminPageResult<AdminPurchaseRequestRecord>> {
    const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
    return this.request(`/api/admin/purchase-requests?${params}`, { cache: 'no-store' });
  }

  decideAdminPurchaseRequest(
    requestId: string,
    decision: 'approve' | 'reject'
  ): Promise<{ result: { id: string; status: string } }> {
    return this.request(`/api/admin/purchase-requests/${encodeURIComponent(requestId)}`, {
      method: 'PATCH',
      body: { decision },
    });
  }

  updateAdminPurchaseFulfillment(
    requestId: string,
    action: 'confirm_payment' | 'confirm_delivery'
  ): Promise<{ result: {
    id: string;
    status: string;
    paymentStatus: string;
    deliveryStatus: string;
  } }> {
    return this.request(
      `/api/admin/purchase-requests/${encodeURIComponent(requestId)}/fulfillment`,
      { method: 'PATCH', body: { action } }
    );
  }

  fetchAdminCollectorApprovals(options: {
    page: number;
    pageSize: number;
    filter: AdminCollectorApprovalFilter;
    search: string;
  }): Promise<AdminPageResult<AdminCollectorApprovalRecord>> {
    const params = new URLSearchParams({
      page: String(options.page),
      pageSize: String(options.pageSize),
      filter: options.filter,
      search: options.search,
    });
    return this.request(`/api/admin/collector-approvals?${params}`);
  }

  updateCollectorApproval(
    profileId: string,
    action: 'approve' | 'reject',
    rejectionReason?: string
  ): Promise<{ id: string; accountStatus: string; collectorApprovedAt: string | null }> {
    return this.request(`/api/admin/collector-approvals/${encodeURIComponent(profileId)}`, {
      method: 'PATCH',
      body: { action, rejectionReason },
    });
  }

  deleteAdminArtwork(artworkId: string): Promise<{ deletedId: string }> {
    return this.request(`/api/admin/artworks/${artworkId}`, { method: 'DELETE' });
  }

  // Purchases and donations
  fetchPurchases(): Promise<{ purchases: Purchase[]; artworks: Artwork[] }> {
    return this.request('/api/purchases');
  }

  checkPurchase(artworkId: string): Promise<{ isPurchased: boolean }> {
    return this.request(`/api/purchases/check/${artworkId}`);
  }

  fetchPurchasedArtworkIds(): Promise<{ artworkIds: string[] }> {
    return this.request('/api/purchases/artwork-ids');
  }

  createDonation(payload: DonationInput): Promise<{ donation: Donation }> {
    return this.request('/api/donations', { method: 'POST', body: payload });
  }

  fetchDonations(): Promise<{ donations: Donation[] }> {
    return this.request('/api/donations');
  }

  fetchDonationsForArtist(artistId: string): Promise<{ donations: Donation[] }> {
    return this.request(`/api/donations/artist/${encodeURIComponent(artistId)}`);
  }

  fetchAdminDonations(): Promise<{ donations: Donation[] }> {
    return this.request('/api/admin/donations');
  }

  // Exhibitions
  fetchExhibitions(status?: ExhibitionStatus): Promise<{ exhibitions: Exhibition[] }> {
    const params = new URLSearchParams();
    if (status) params.set('status', status);
    return this.request(`/api/exhibitions?${params}`);
  }

  fetchExhibition(exhibitionId: string): Promise<{ exhibition: Exhibition }> {
    return this.request(`/api/exhibitions/${encodeURIComponent(exhibitionId)}`);
  }

  createExhibition(payload: ExhibitionInput): Promise<{ exhibition: Exhibition }> {
    return this.request('/api/exhibitions', { method: 'POST', body: payload });
  }

  updateExhibition(
    exhibitionId: string,
    payload: Partial<ExhibitionInput>
  ): Promise<{ exhibition: Exhibition }> {
    return this.request(`/api/exhibitions/${encodeURIComponent(exhibitionId)}`, {
      method: 'PATCH',
      body: payload,
    });
  }

  deleteExhibition(exhibitionId: string): Promise<{ deletedId: string }> {
    return this.request(`/api/exhibitions/${encodeURIComponent(exhibitionId)}`, {
      method: 'DELETE',
    });
  }

  fetchExhibitionArtworks(exhibitionId: string): Promise<{ artworks: any[] }> {
    return this.request(`/api/exhibitions/${encodeURIComponent(exhibitionId)}/artworks`);
  }

  addArtworkToExhibition(exhibitionId: string, artworkId: string): Promise<{ result: any }> {
    return this.request(`/api/exhibitions/${encodeURIComponent(exhibitionId)}/artworks`, {
      method: 'POST',
      body: { artworkId },
    });
  }

  removeArtworkFromExhibition(
    exhibitionId: string,
    artworkId: string
  ): Promise<{ removed: boolean }> {
    return this.request(
      `/api/exhibitions/${encodeURIComponent(exhibitionId)}/artworks/${encodeURIComponent(artworkId)}`,
      { method: 'DELETE' }
    );
  }

  createExhibitionSubmission(
    payload: ExhibitionSubmissionInput
  ): Promise<{ submission: ExhibitionSubmission }> {
    return this.request('/api/exhibitions/submissions', { method: 'POST', body: payload });
  }

  fetchExhibitionSubmissions(
    exhibitionId: string
  ): Promise<{ submissions: ExhibitionSubmission[] }> {
    return this.request(`/api/exhibitions/${encodeURIComponent(exhibitionId)}/submissions`);
  }

  updateExhibitionSubmission(
    submissionId: string,
    status: string,
    notes?: string
  ): Promise<{ submission: ExhibitionSubmission }> {
    return this.request(`/api/exhibitions/submissions/${encodeURIComponent(submissionId)}`, {
      method: 'PATCH',
      body: { status, notes },
    });
  }
}

export const artverseApi = new ApiClient();
