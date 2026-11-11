export type UserRole = 'artist' | 'collector' | 'art_lover';
export type AccountRole = UserRole | 'admin';

// Role display labels
export const ROLE_LABELS: Record<AccountRole, string> = {
  admin: 'Administrator',
  artist: 'Artist',
  collector: 'Collector',
  art_lover: 'Art Lover',
};

// Role descriptions
export const ROLE_DESCRIPTIONS: Record<AccountRole, string> = {
  admin: 'Full access to all platform features and management tools',
  artist: 'Create profiles, upload artwork, offer pieces for sale',
  collector: 'Browse artwork, purchase pieces, maintain personal collection gallery',
  art_lover: 'Browse and view all publicly posted artwork',
};

// Feature permissions by role
export const ROLE_PERMISSIONS: Record<AccountRole, {
  canBrowse: boolean;
  canPurchase: boolean;
  canUploadArtwork: boolean;
  canCreatePosts: boolean;
  canMakeOffers: boolean;
  canViewCollection: boolean;
}> = {
  admin: {
    canBrowse: true,
    canPurchase: true,
    canUploadArtwork: true,
    canCreatePosts: true,
    canMakeOffers: true,
    canViewCollection: true,
  },
  artist: {
    canBrowse: true,
    canPurchase: false,
    canUploadArtwork: true,
    canCreatePosts: true,
    canMakeOffers: false,
    canViewCollection: true,
  },
  collector: {
    canBrowse: true,
    canPurchase: true,
    canUploadArtwork: false,
    canCreatePosts: false,
    canMakeOffers: true,
    canViewCollection: true,
  },
  art_lover: {
    canBrowse: true,
    canPurchase: false,
    canUploadArtwork: false,
    canCreatePosts: false,
    canMakeOffers: false,
    canViewCollection: false,
  },
};

export const ARTWORK_CATEGORIES = [
  'ceramics',
  'mixed_media',
  'sculpture',
  'painting',
  'photography',
  'drawing',
  'digital_art',
  'other',
] as const;

export type ArtworkCategory = (typeof ARTWORK_CATEGORIES)[number];

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

export type AccountStatus = 'active' | 'pending' | 'pending_approval' | 'suspended' | 'deleted';

export interface Profile {
  id: string;
  email: string;
  fullName: string;
  handle: string;
  username: string;
  role: AccountRole;
  accountStatus: AccountStatus;
  registrationDate: string;
  avatarUrl: string | null;
  coverUrl: string | null;
  bio: string;
  location: string;
  discipline: string;
  verified: boolean;
  isDemo: boolean;
  createdAt: string;
  updatedAt?: string;
  // Collector approval fields
  collectorApprovedAt?: string | null;
  collectorApprovedBy?: string | null;
  collectorRejectionReason?: string | null;
}

export type ArtistProfile = Pick<
  Profile,
  | 'id'
  | 'fullName'
  | 'handle'
  | 'username'
  | 'role'
  | 'accountStatus'
  | 'registrationDate'
  | 'avatarUrl'
  | 'coverUrl'
  | 'bio'
  | 'location'
  | 'discipline'
  | 'verified'
  | 'createdAt'
  | 'updatedAt'
>;

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
  status: 'intent_created' | 'awaiting_payment' | 'cancelled' | 'completed';
  shippingCity: string;
  collectorNote: string;
  createdAt: string;
}

export interface PurchaseRequestReceipt {
  id: string;
  status: string;
  amount: number;
  currency: string;
  createdAt: string;
}

export interface PurchaseRequest {
  id: string;
  artworkId: string | null;
  artworkTitle: string;
  artworkImage: string;
  artistName: string;
  amount: number;
  currency: string;
  status: string;
  createdAt: string;
  adminDecidedAt: string | null;
}

export interface Purchase {
  id: string;
  artworkId: string;
  collectorId: string;
  orderId: string;
  purchaseRequestId: string | null;
  purchasePrice: number;
  currency: string;
  paymentStatus: 'pending' | 'confirmed';
  paymentConfirmedAt: string | null;
  deliveryStatus: 'pending' | 'confirmed';
  deliveryConfirmedAt: string | null;
  purchasedAt: string;
}

export interface UserNotification {
  id: string;
  recipientId: string;
  type: string;
  title: string;
  body: string;
  linkUrl: string;
  isRead: boolean;
  createdAt: string;
}

export type DonationStatus = 'pending' | 'completed' | 'refunded' | 'failed';

export interface Donation {
  id: string;
  donorId: string;
  artistId: string | null;
  artworkId: string | null;
  amount: number;
  currency: string;
  message: string | null;
  isAnonymous: boolean;
  status: DonationStatus;
  paymentReference: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DonationInput {
  artistId?: string;
  artworkId?: string;
  amount: number;
  currency?: string;
  message?: string;
  isAnonymous?: boolean;
}

export type ExhibitionStatus = 'draft' | 'scheduled' | 'active' | 'archived' | 'cancelled';

export interface Exhibition {
  id: string;
  title: string;
  description: string;
  curatorId: string | null;
  coverImageKey: string | null;
  startDate: string;
  endDate: string;
  location: string | null;
  isVirtual: boolean;
  virtualUrl: string | null;
  status: ExhibitionStatus;
  featured: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ExhibitionInput {
  title: string;
  description?: string;
  coverImageKey?: string | null;
  startDate: string;
  endDate: string;
  location?: string | null;
  isVirtual?: boolean;
  virtualUrl?: string | null;
  status?: ExhibitionStatus;
  featured?: boolean;
}

export type ExhibitionSubmissionStatus = 'submitted' | 'under_review' | 'accepted' | 'rejected' | 'withdrawn';

export interface ExhibitionSubmission {
  id: string;
  exhibitionId: string;
  artistId: string;
  artworkId: string;
  curatorNotes: string | null;
  status: ExhibitionSubmissionStatus;
  submittedAt: string;
  reviewedAt: string | null;
  reviewedBy: string | null;
}

export interface ExhibitionSubmissionInput {
  exhibitionId: string;
  artworkId: string;
  curatorNotes?: string;
}

export interface ArtworkWithPurchase extends Artwork {
  isPurchased: boolean;
  purchase?: Purchase;
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
