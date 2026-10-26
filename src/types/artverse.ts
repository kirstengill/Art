export type UserRole = 'artist' | 'collector' | 'art_lover';

export type ArtworkCategory =
  | 'painting'
  | 'photography'
  | 'sculpture'
  | 'drawing'
  | 'digital_art';

export type AvailabilityStatus = 'available' | 'reserved' | 'sold';

export type SaleMode =
  | 'buy_now'
  | 'negotiation_only'
  | 'buy_now_and_negotiation';

export type OfferStatus =
  | 'pending'
  | 'accepted'
  | 'rejected'
  | 'countered'
  | 'withdrawn'
  | 'expired';

export interface Profile {
  id: string;
  email: string;
  fullName: string;
  handle: string;
  role: UserRole;
  avatarUrl: string | null;
  coverUrl: string | null;
  bio: string;
  location: string;
  discipline: string;
  verified: boolean;
  isDemo: boolean;
  createdAt: string;
}

export interface Artwork {
  id: string;
  artistId: string;
  title: string;
  description: string;
  category: ArtworkCategory;
  medium: string;
  dimensions: string;
  year: number;
  price: number;
  currency: string;
  availability: AvailabilityStatus;
  saleMode: SaleMode;
  imageKey: string;
  provenance: string;
  accessionNumber: string;
  editionInfo: string;
  featured: boolean;
  likesCount: number;
  isDemo: boolean;
  createdAt: string;
}

export interface CommunityPost {
  id: string;
  authorId: string;
  artworkId: string | null;
  title: string;
  body: string;
  imageKey: string | null;
  likesCount: number;
  commentsCount: number;
  isDemo: boolean;
  createdAt: string;
}

export interface PostComment {
  id: string;
  postId: string;
  authorId: string;
  body: string;
  createdAt: string;
}

export interface Conversation {
  id: string;
  artworkId: string;
  collectorId: string;
  artistId: string;
  lastMessagePreview: string;
  lastMessageAt: string;
  unreadCount?: number;
  isDemo: boolean;
  createdAt: string;
}

export interface ConversationMessage {
  id: string;
  conversationId: string;
  senderId: string;
  body: string;
  attachmentName: string | null;
  messageType: 'text' | 'offer_event' | 'system';
  createdAt: string;
}

export interface ArtworkOffer {
  id: string;
  conversationId: string;
  artworkId: string;
  senderId: string;
  recipientId: string;
  amount: number;
  currency: string;
  status: OfferStatus;
  note: string;
  parentOfferId: string | null;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface OrderIntent {
  id: string;
  artworkId: string;
  buyerId: string;
  sellerId: string;
  offerId: string | null;
  amount: number;
  currency: string;
  status: 'intent_created' | 'awaiting_payment' | 'cancelled';
  shippingCity: string;
  collectorNote: string;
  createdAt: string;
}

export interface ArtworkInput {
  id?: string;
  title: string;
  description: string;
  category: ArtworkCategory;
  medium: string;
  dimensions: string;
  year: number;
  price: number;
  currency: string;
  availability: AvailabilityStatus;
  saleMode: SaleMode;
  imageKey: string;
  provenance?: string;
  editionInfo?: string;
}
