import { randomUUID } from 'node:crypto';
import {
  getSupabaseServiceClient,
  type SupabaseDataClient,
} from '../lib/supabase-server.ts';
import {
  syncProfileWithOperations,
  type SyncProfileRecord,
  type SyncProfileValues,
  type SyncUserProfileParams,
} from './profileSync.ts';
import {
  parsePurchaseRequestInput,
  PurchaseRequestValidationError,
  PurchaseWorkflowError,
  type PurchaseRequestInput,
} from '../utils/purchaseRequests.ts';
import { ARTWORK_CATEGORIES } from '../types/artverse';
import type { Artwork, Donation, DonationInput, Exhibition, ExhibitionInput, ExhibitionStatus, ExhibitionSubmission, ExhibitionSubmissionInput, ExhibitionSubmissionStatus, Purchase, PurchaseRequestReceipt } from '../types/artverse';

type DbRow = Record<string, unknown>;

async function execute<T>(
  request: PromiseLike<{ data: T | null; error: { message: string } | null }>
): Promise<T> {
  const { data, error } = await request;
  if (error) throw new Error(error.message);
  return data as T;
}

async function executeOptional<T>(
  request: PromiseLike<{ data: T | null; error: { message: string } | null }>
): Promise<T | null> {
  const { data, error } = await request;
  if (error) throw new Error(error.message);
  return data;
}

function fromDatabase<T>(value: unknown): T {
  if (Array.isArray(value)) {
    return value.map((item) => fromDatabase(item)) as T;
  }
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [
        key.replace(/_([a-z])/g, (_match, letter: string) => letter.toUpperCase()),
        fromDatabase(item),
      ])
    ) as T;
  }
  return value as T;
}

export { fromDatabase };

function toDatabase(value: object): DbRow {
  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [
      key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`),
      item,
    ])
  );
}

async function one<T>(
  request: PromiseLike<{ data: unknown; error: { message: string } | null }>
): Promise<T | undefined> {
  const data = await executeOptional(request);
  return data === null ? undefined : fromDatabase<T>(data);
}

async function many<T>(
  request: PromiseLike<{ data: unknown; error: { message: string } | null }>
): Promise<T[]> {
  const data = await execute(request);
  if (!Array.isArray(data)) throw new Error('Supabase returned an invalid row set.');
  return fromDatabase<T[]>(data);
}

function requireImageKey(imageKey: string): void {
  if (
    typeof imageKey !== 'string' ||
    !imageKey ||
    imageKey.startsWith('data:image/') ||
    !storageObjectPath(imageKey)
  ) {
    throw new Error('Artwork images must be uploaded to Supabase Storage before publishing.');
  }
}

function storageObjectPath(imageKey: string): string | undefined {
  const marker = '/storage/v1/object/public/artwork-images/';
  const index = imageKey.indexOf(marker);
  if (index >= 0) return decodeURIComponent(imageKey.slice(index + marker.length));
  if (!imageKey.includes('://') && !imageKey.startsWith('/')) return imageKey;
  return undefined;
}

export async function syncUserProfile(params: SyncUserProfileParams) {
  const db = getSupabaseServiceClient();
  return syncProfileWithOperations(params, {
    getProfile: async (uid) =>
      one(db.from('profiles').select('*').eq('id', uid).maybeSingle()),
    isHandleTaken: async (handle, exceptUid) => {
      const profile = await one<DbRow>(
        db
          .from('profiles')
          .select('id')
          .or(`handle.eq.${handle},username.eq.${handle}`)
          .neq('id', exceptUid)
          .limit(1)
          .maybeSingle()
      );
      return Boolean(profile);
    },
    insertProfile: async (values: SyncProfileValues) => {
      const profile = await one<SyncProfileRecord>(
        db
          .from('profiles')
          .insert(toDatabase(values))
          .select('*')
          .single()
      );
      if (!profile) throw new Error('Supabase did not return the saved profile.');
      return profile;
    },
    updateProfile: async (uid, values) => {
      const updated = await one<SyncProfileRecord>(
        db
          .from('profiles')
          .update(toDatabase({ ...values, updatedAt: new Date().toISOString() }))
          .eq('id', uid)
          .select('*')
          .single()
      );
      if (!updated) throw new Error('Profile disappeared during synchronization.');
      return updated;
    },
    saveAccountDetails: async (details) => {
      await execute(
        db.from('user_account_details').upsert(
          {
            user_id: details.uid,
            first_name: details.firstName,
            last_name: details.lastName,
            phone_number: details.phoneNumber,
            location: details.location || null,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id' }
        )
      );
    },
  });
}

export async function getArtists(db: SupabaseDataClient) {
  return many(
    db
      .from('profiles')
      .select('id,full_name,handle,username,role,account_status,registration_date,avatar_url,cover_url,bio,location,discipline,verified,is_demo,created_at,updated_at')
      .eq('role', 'artist')
      .eq('account_status', 'active')
      .eq('is_demo', false)
      .order('created_at', { ascending: false })
  );
}

export function filterVisibleCatalogRows(
  profileRows: DbRow[],
  artworkRows: DbRow[],
  postRows: DbRow[],
  commentRows: DbRow[]
) {
  const visibleProfiles = profileRows.filter((profile) => !profile.isDemo);
  const visibleProfileIds = new Set(visibleProfiles.map((profile) => profile.id));
  const visibleArtworks = artworkRows.filter(
    (artwork) => !artwork.isDemo && visibleProfileIds.has(String(artwork.artistId))
  );
  const visibleArtworkIds = new Set(visibleArtworks.map((artwork) => artwork.id));
  const visiblePosts = postRows.filter(
    (post) => !post.isDemo && visibleProfileIds.has(String(post.authorId))
  );
  const visiblePostIds = new Set(visiblePosts.map((post) => post.id));
  const visibleComments = commentRows.filter(
    (comment) =>
      visiblePostIds.has(String(comment.postId)) &&
      visibleProfileIds.has(String(comment.authorId))
  );

  return {
    visibleProfiles,
    visibleProfileIds,
    visibleArtworks,
    visibleArtworkIds,
    visiblePosts,
    visiblePostIds,
    visibleComments,
  };
}

export async function getPublicCatalog(db: SupabaseDataClient, viewerUid?: string) {
  const [
    profileRows,
    artworkRows,
    postRows,
    commentRows,
    followRows,
    likeRows,
    collections,
  ] = await Promise.all([
    many<DbRow>(
      db
        .from('profiles')
        .select('id,full_name,handle,username,role,account_status,registration_date,avatar_url,cover_url,bio,location,discipline,verified,is_demo,created_at,updated_at')
        .order('created_at', { ascending: false })
    ),
    many<DbRow>(db.from('artworks').select('*').order('created_at', { ascending: false })),
    many<DbRow>(db.from('posts').select('*').order('created_at', { ascending: false })),
    many<DbRow>(db.from('comments').select('*').order('created_at')),
    viewerUid
      ? many<DbRow>(db.from('follows').select('*').eq('follower_id', viewerUid))
      : Promise.resolve([]),
    viewerUid
      ? many<DbRow>(db.from('likes').select('*').eq('user_id', viewerUid))
      : Promise.resolve([]),
    viewerUid
      ? many<DbRow>(db.from('collections').select('*').eq('owner_id', viewerUid).limit(1))
      : Promise.resolve([]),
  ]);
  const savedRows =
    viewerUid && collections.length
      ? await many<DbRow>(
          db
            .from('collection_items')
            .select('*')
            .eq('collection_id', String(collections[0].id))
        )
      : [];

  const {
    visibleProfiles,
    visibleProfileIds,
    visibleArtworks,
    visibleArtworkIds,
    visiblePosts,
    visiblePostIds,
    visibleComments,
  } = filterVisibleCatalogRows(profileRows, artworkRows, postRows, commentRows);

  return {
    profiles: visibleProfiles.map((profile) => ({
      ...profile,
      email: '',
    })),
    artworks: visibleArtworks,
    posts: visiblePosts,
    comments: visibleComments,
    followedArtistIds: followRows
      .filter((follow) => visibleProfileIds.has(String(follow.followingId)))
      .map((follow) => String(follow.followingId)),
    likedPostIds: likeRows
      .filter((like) => visiblePostIds.has(String(like.postId)))
      .map((like) => String(like.postId)),
    savedArtworkIds: savedRows
      .map((item) => String(item.artworkId))
      .filter((id) => visibleArtworkIds.has(id)),
  };
}

export async function upsertArtworkListing(
  db: SupabaseDataClient,
  ownerUid: string,
  payload: {
    id?: string;
    title: string;
    description: string;
    category: string;
    medium: string;
    dimensions: string;
    year: number;
    price: number;
    currency: string;
    availability: string;
    saleMode: string;
    imageKey: string;
    provenance?: string;
    editionInfo?: string;
  }
) {
  const owner = await one<DbRow>(db.from('profiles').select('role').eq('id', ownerUid).maybeSingle());
  if (owner?.role !== 'artist') throw new Error('Forbidden: Only artist accounts may publish artwork.');
  if (!ARTWORK_CATEGORIES.some((category) => category === payload.category)) {
    throw new Error('Invalid artwork category.');
  }
  const price = Number(payload.price);
  if (!Number.isFinite(price) || price < 50) {
    throw new Error('Enter a valid listing price of at least 50.');
  }
  if (typeof payload.title !== 'string' || payload.title.trim().length < 2) {
    throw new Error('Artwork title must contain at least 2 characters.');
  }
  if (typeof payload.description !== 'string' || payload.description.trim().length < 20) {
    throw new Error('Artwork description must contain at least 20 characters.');
  }
  requireImageKey(payload.imageKey);

  const values = {
    title: payload.title.trim(),
    description: payload.description.trim(),
    category: payload.category,
    medium: payload.medium.trim(),
    dimensions: payload.dimensions.trim(),
    year: payload.year,
    price: Math.round(price),
    currency: payload.currency || 'USD',
    availability: 'available',
    saleMode: 'buy_now',
    imageKey: payload.imageKey,
    provenance: payload.provenance?.trim() || 'Direct from the artist studio',
    editionInfo: payload.editionInfo?.trim() || 'Unique 1 of 1 original work',
  };

  if (payload.id) {
    const existing = await one<DbRow>(db.from('artworks').select('*').eq('id', payload.id).maybeSingle());
    if (!existing) throw new Error('Artwork listing not found.');
    if (existing.artistId !== ownerUid) {
      throw new Error('Forbidden: Only the creator artist may edit this artwork.');
    }
    values.availability = String(existing.availability || 'available');
    values.provenance = payload.provenance?.trim() || String(existing.provenance);
    values.editionInfo = payload.editionInfo?.trim() || String(existing.editionInfo);
    return one(
      db
        .from('artworks')
        .update(toDatabase({ ...values, updatedAt: new Date().toISOString() }))
        .eq('id', payload.id)
        .eq('artist_id', ownerUid)
        .select('*')
        .single()
    );
  }

  return one(
    db
      .from('artworks')
      .insert(
        toDatabase({
          id: `art-${randomUUID()}`,
          artistId: ownerUid,
          ...values,
          accessionNumber: `AV-${new Date().getFullYear()}-${randomUUID().slice(0, 6).toUpperCase()}`,
        })
      )
      .select('*')
      .single()
  );
}

export async function removeArtworkListing(
  db: SupabaseDataClient,
  ownerUid: string,
  artworkId: string
) {
  const artwork = await one<DbRow>(db.from('artworks').select('*').eq('id', artworkId).maybeSingle());
  if (!artwork) throw new Error('Artwork not found.');
  if (artwork.isDemo) throw new Error('This artwork is not available for inquiries.');
  if (artwork.artistId !== ownerUid) {
    throw new Error('Forbidden: Only the artwork owner may delete this listing.');
  }
  await ensureArtworkHasNoPurchase(getSupabaseServiceClient(), artworkId);
  const objectPath = storageObjectPath(String(artwork.imageKey || ''));
  if (objectPath) {
    const { error } = await db.storage.from('artwork-images').remove([objectPath]);
    if (error) throw new Error(`Unable to remove artwork image: ${error.message}`);
  }
  await execute(db.from('artworks').delete().eq('id', artworkId).eq('artist_id', ownerUid));
  return { deletedId: artworkId };
}

export async function removeAdminArtworkListing(
  db: SupabaseDataClient,
  artworkId: string
) {
  const { data: artwork, error: lookupError } = await db
    .from('artworks')
    .select('image_key')
    .eq('id', artworkId)
    .maybeSingle();
  if (lookupError) throw new Error(lookupError.message);
  if (!artwork) throw new Error('Artwork not found.');
  await ensureArtworkHasNoPurchase(db, artworkId);

  const objectPath = storageObjectPath(String(artwork.image_key || ''));
  if (objectPath) {
    const { error } = await db.storage.from('artwork-images').remove([objectPath]);
    if (error) throw new Error(`Unable to remove artwork image: ${error.message}`);
  }

  const { data: deleted, error: deleteError } = await db
    .from('artworks')
    .delete()
    .eq('id', artworkId)
    .select('id')
    .maybeSingle();
  if (deleteError) throw new Error(deleteError.message);
  if (!deleted) throw new Error('Artwork was not deleted. Administrator access is required.');
  return { deletedId: artworkId };
}

async function ensureArtworkHasNoPurchase(db: SupabaseDataClient, artworkId: string) {
  const purchase = await one<DbRow>(
    db.from('purchases').select('id').eq('artwork_id', artworkId).maybeSingle()
  );
  if (purchase) {
    throw new Error('This artwork has an approved purchase and cannot be permanently deleted.');
  }
}

export async function toggleSavedArtworkInDb(db: SupabaseDataClient, ownerUid: string, artworkId: string) {
  let collections = await many<DbRow>(db.from('collections').select('*').eq('owner_id', ownerUid).limit(1));
  if (!collections.length) {
    collections = [
      (await one<DbRow>(
        db
          .from('collections')
          .insert({
            id: `col-${ownerUid.slice(0, 12)}`,
            owner_id: ownerUid,
            title: 'Saved Works',
            description: 'Private shortlist of collected and watched works.',
            is_public: false,
          })
          .select('*')
          .single()
      ))!,
    ];
  }
  const collectionId = String(collections[0].id);
  const saved = await one<DbRow>(
    db
      .from('collection_items')
      .select('*')
      .eq('collection_id', collectionId)
      .eq('artwork_id', artworkId)
      .maybeSingle()
  );
  if (saved) {
    await execute(db.from('collection_items').delete().eq('id', saved.id));
    return { saved: false };
  }
  await execute(
    db.from('collection_items').insert({ collection_id: collectionId, artwork_id: artworkId })
  );
  return { saved: true };
}

export async function toggleFollowInDb(db: SupabaseDataClient, followerUid: string, artistId: string) {
  const existing = await one<DbRow>(
    db.from('follows').select('*').eq('follower_id', followerUid).eq('following_id', artistId).maybeSingle()
  );
  if (existing) {
    await execute(db.from('follows').delete().eq('id', existing.id).eq('follower_id', followerUid));
    return { following: false };
  }
  await execute(db.from('follows').insert({ follower_id: followerUid, following_id: artistId }));
  return { following: true };
}

export async function createPostInDb(
  db: SupabaseDataClient,
  authorUid: string,
  payload: { title: string; body: string; artworkId?: string; imageKey?: string }
) {
  return one(
    db
      .from('posts')
      .insert({
        id: `post-${randomUUID()}`,
        author_id: authorUid,
        artwork_id: payload.artworkId || null,
        title: payload.title.trim(),
        body: payload.body.trim(),
        image_key: payload.imageKey || null,
      })
      .select('*')
      .single()
  );
}

export async function addCommentInDb(db: SupabaseDataClient, authorUid: string, postId: string, body: string) {
  const inserted = await one<DbRow>(
    db
      .from('comments')
      .insert({ id: `comment-${randomUUID()}`, post_id: postId, author_id: authorUid, body: body.trim() })
      .select('*')
      .single()
  );
  return inserted;
}

export async function togglePostLikeInDb(db: SupabaseDataClient, userUid: string, postId: string) {
  const existing = await one<DbRow>(
    db.from('likes').select('*').eq('post_id', postId).eq('user_id', userUid).maybeSingle()
  );
  if (existing) {
    await execute(db.from('likes').delete().eq('id', existing.id).eq('user_id', userUid));
  } else {
    await execute(db.from('likes').insert({ post_id: postId, user_id: userUid }));
  }
  const likes = await many<DbRow>(db.from('likes').select('id').eq('post_id', postId));
  return { liked: !existing, likesCount: likes.length };
}

export async function getConversationsForParticipant(db: SupabaseDataClient, uid: string) {
  const conversations = await many<DbRow>(
    db
      .from('conversations')
      .select('*')
      .or(`collector_id.eq.${uid},artist_id.eq.${uid}`)
      .order('last_message_at', { ascending: false })
  );
  const visible = conversations.filter((conversation) => !conversation.is_demo);
  if (!visible.length) return { conversations: [], messages: [], offers: [] };
  const ids = visible.map((conversation) => String(conversation.id));
  const [messages, offers] = await Promise.all([
    many(db.from('messages').select('*').in('conversation_id', ids).order('created_at')),
    many(db.from('artwork_offers').select('*').in('conversation_id', ids).order('created_at')),
  ]);
  return {
    conversations: visible.map((row) => fromDatabase(row)),
    messages: messages.map((row) => fromDatabase(row)),
    offers: offers.map((row) => fromDatabase(row)),
  };
}

export async function getOrCreateArtworkConversation(
  db: SupabaseDataClient,
  collectorUid: string,
  artworkId: string
) {
  const profile = await one<DbRow>(db.from('profiles').select('role, account_status, collector_approved_at').eq('id', collectorUid).maybeSingle());
  if (!profile || !['collector', 'art_lover'].includes(String(profile.role))) {
    throw new Error('Forbidden: A collector or art lover account is required.');
  }
  if (String(profile.role) === 'collector') {
    const isApproved = String(profile.account_status) === 'active' && profile.collector_approved_at !== null;
    if (!isApproved) {
      throw new Error('Your collector account is pending approval. You will be able to contact artists once approved.');
    }
  }
  const artwork = await one<DbRow>(db.from('artworks').select('*').eq('id', artworkId).maybeSingle());
  if (!artwork) throw new Error('Artwork not found.');
  const existing = await one<DbRow>(
    db
      .from('conversations')
      .select('*')
      .eq('artwork_id', artworkId)
      .eq('collector_id', collectorUid)
      .maybeSingle()
  );
  if (existing) return fromDatabase(existing);
  return one(
    db
      .from('conversations')
      .insert({
        id: `conv-${randomUUID()}`,
        artwork_id: artworkId,
        collector_id: collectorUid,
        artist_id: artwork.artist_id,
        last_message_preview: `Inquiry opened regarding ${artwork.title}`,
      })
      .select('*')
      .single()
  );
}

export async function appendMessageToDb(
  db: SupabaseDataClient,
  senderUid: string,
  conversationId: string,
  body: string,
  attachmentName?: string
) {
  const conversation = await one<DbRow>(
    db.from('conversations').select('*').eq('id', conversationId).maybeSingle()
  );
  if (!conversation) throw new Error('Conversation not found.');
  if (conversation.collector_id !== senderUid && conversation.artist_id !== senderUid) {
    throw new Error('Forbidden: Only conversation participants can send messages.');
  }
  const message = await one<DbRow>(
    db
      .from('messages')
      .insert({
        id: `msg-${randomUUID()}`,
        conversation_id: conversationId,
        sender_id: senderUid,
        body: body.trim(),
        attachment_name: attachmentName || null,
        message_type: 'text',
      })
      .select('*')
      .single()
  );
  await execute(
    db
      .from('conversations')
      .update({
        last_message_preview: body.trim().slice(0, 140),
        last_message_at: new Date().toISOString(),
      })
      .eq('id', conversationId)
  );
  return message;
}

export async function createOfferInDb(
  db: SupabaseDataClient,
  params: { senderUid: string; conversationId: string; amount: number; currency: string; note: string }
) {
  const conversation = await one<DbRow>(
    db.from('conversations').select('*').eq('id', params.conversationId).maybeSingle()
  );
  if (!conversation) throw new Error('Conversation not found.');
  if (conversation.collector_id !== params.senderUid) {
    throw new Error('Forbidden: Only collector accounts may submit new offers.');
  }
  const profile = await one<DbRow>(db.from('profiles').select('role, account_status, collector_approved_at').eq('id', params.senderUid).maybeSingle());
  if (profile?.role !== 'collector') throw new Error('Forbidden: Only collector accounts may submit new offers.');
  if (String(profile.account_status) !== 'active' || profile.collector_approved_at === null) {
    throw new Error('Your collector account is pending approval. You cannot make offers until approved.');
  }
  const artwork = await one<DbRow>(db.from('artworks').select('*').eq('id', conversation.artwork_id).maybeSingle());
  if (!artwork) throw new Error('Linked artwork not found.');
  if (artwork.sale_mode === 'buy_now') throw new Error('This artwork is listed for fixed-price purchase only.');
  if (!Number.isFinite(params.amount) || params.amount <= 0) throw new Error('Offer amount must be positive.');
  const summary = `Proposed an offer of $${Math.round(params.amount).toLocaleString()} ${params.currency || artwork.currency}${params.note.trim() ? ` · "${params.note.trim()}"` : ''}`;
  const offer = await one<DbRow>(
    db
      .from('artwork_offers')
      .insert({
        id: `offer-${randomUUID()}`,
        conversation_id: conversation.id,
        artwork_id: conversation.artwork_id,
        sender_id: params.senderUid,
        recipient_id: conversation.artist_id,
        amount: Math.round(params.amount),
        currency: params.currency || artwork.currency,
        status: 'pending',
        note: params.note.trim(),
      })
      .select('*')
      .single()
  );
  await execute(
    db.from('messages').insert({
      id: `msg-${randomUUID()}`,
      conversation_id: conversation.id,
      sender_id: params.senderUid,
      body: summary,
      message_type: 'offer_event',
    })
  );
  await execute(
    db.from('conversations').update({
      last_message_preview: summary.slice(0, 140),
      last_message_at: new Date().toISOString(),
    }).eq('id', conversation.id)
  );
  return offer;
}

export async function transitionOfferStatusInDb(
  db: SupabaseDataClient,
  params: {
    actorUid: string;
    offerId: string;
    action: 'accept' | 'reject' | 'withdraw' | 'counter';
    counterAmount?: number;
    note?: string;
  }
) {
  const offer = await one<DbRow>(db.from('artwork_offers').select('*').eq('id', params.offerId).maybeSingle());
  if (!offer) throw new Error('Offer not found.');
  if (offer.status !== 'pending') throw new Error(`Offer can no longer be modified (current status: ${offer.status}).`);
  const isWithdraw = params.action === 'withdraw';
  if ((isWithdraw && offer.sender_id !== params.actorUid) || (!isWithdraw && offer.recipient_id !== params.actorUid)) {
    throw new Error(`Forbidden: ${isWithdraw ? 'Only the sender' : 'Only the offer recipient'} may perform this action.`);
  }

  if (params.action === 'counter' && (!params.counterAmount || params.counterAmount <= 0)) {
    throw new Error('Valid counteroffer amount is required.');
  }
  const nextStatus =
    params.action === 'withdraw'
      ? 'withdrawn'
      : params.action === 'accept'
        ? 'accepted'
        : params.action === 'reject'
          ? 'rejected'
          : 'countered';
  const updatedOffer = await one<DbRow>(
    db
      .from('artwork_offers')
      .update({ status: nextStatus, updated_at: new Date().toISOString() })
      .eq('id', offer.id)
      .eq('status', 'pending')
      .select('*')
      .single()
  );
  if (nextStatus === 'accepted') {
    await execute(
      db.from('artworks').update({ availability: 'reserved', updated_at: new Date().toISOString() }).eq('id', offer.artwork_id)
    );
  }
  let counterOffer: DbRow | null = null;
  let eventText: string;
  if (nextStatus === 'countered') {
    counterOffer =
      (await one<DbRow>(
      db
        .from('artwork_offers')
        .insert({
          id: `offer-${randomUUID()}`,
          conversation_id: offer.conversation_id,
          artwork_id: offer.artwork_id,
          sender_id: params.actorUid,
          recipient_id: offer.sender_id,
          amount: Math.round(params.counterAmount!),
          currency: offer.currency,
          status: 'pending',
          note: params.note?.trim() || '',
          parent_offer_id: offer.id,
        })
        .select('*')
        .single()
      )) || null;
    eventText = `Countered at $${Math.round(params.counterAmount!).toLocaleString()} ${offer.currency}${params.note?.trim() ? ` · "${params.note.trim()}"` : ''}`;
  } else if (nextStatus === 'accepted') {
    eventText = `Accepted offer of $${Number(offer.amount).toLocaleString()} ${offer.currency}. Settlement remains pending collector invoice checkout.`;
  } else if (nextStatus === 'rejected') {
    eventText = `Declined offer of $${Number(offer.amount).toLocaleString()} ${offer.currency}.`;
  } else {
    eventText = `Withdrew offer of $${Number(offer.amount).toLocaleString()} ${offer.currency}.`;
  }
  await execute(
    db.from('messages').insert({
      id: `msg-${randomUUID()}`,
      conversation_id: offer.conversation_id,
      sender_id: params.actorUid,
      body: eventText,
      message_type: 'offer_event',
    })
  );
  await execute(
    db.from('conversations').update({
      last_message_preview: eventText.slice(0, 140),
      last_message_at: new Date().toISOString(),
    }).eq('id', offer.conversation_id)
  );
  return {
    updatedOffer: fromDatabase(updatedOffer),
    counterOffer: counterOffer ? fromDatabase(counterOffer) : null,
  };
}

export async function createPurchaseIntentInDb(
  db: SupabaseDataClient,
  params: { buyerUid: string; artworkId: string; offerId?: string; shippingCity: string; collectorNote: string }
) {
  const buyer = await one<DbRow>(db.from('profiles').select('role, account_status, collector_approved_at').eq('id', params.buyerUid).maybeSingle());
  if (buyer?.role !== 'collector') throw new Error('Forbidden: A collector account is required to create a purchase intent.');
  if (String(buyer.account_status) !== 'active' || buyer.collector_approved_at === null) {
    throw new Error('Your collector account is pending approval. You cannot create purchase intents until approved.');
  }
  const artwork = await one<DbRow>(db.from('artworks').select('*').eq('id', params.artworkId).maybeSingle());
  if (!artwork) throw new Error('Artwork not found.');
  if (artwork.availability === 'sold') throw new Error('This artwork is no longer available.');
  let amount = Number(artwork.price);
  let currency = String(artwork.currency);
  if (params.offerId) {
    const offer = await one<DbRow>(
      db.from('artwork_offers').select('*').eq('id', params.offerId).maybeSingle()
    );
    if (!offer || offer.status !== 'accepted' || offer.artwork_id !== artwork.id) {
      throw new Error('Referenced offer must be accepted for this artwork before creating an inquiry.');
    }
    amount = Number(offer.amount);
    currency = String(offer.currency);
  } else if (artwork.sale_mode === 'negotiation_only') {
    throw new Error('This work requires an accepted offer prior to acquisition.');
  }
  return one(
    db
      .from('orders')
      .insert({
        id: `ord-${randomUUID()}`,
        artwork_id: artwork.id,
        buyer_id: params.buyerUid,
        seller_id: artwork.artist_id,
        offer_id: params.offerId || null,
        amount,
        currency,
        status: 'awaiting_payment',
        shipping_city: params.shippingCity.trim(),
        collector_note: params.collectorNote.trim(),
      })
      .select('*')
      .single()
  );
}

export async function createPurchaseRequestInDb(
  db: SupabaseDataClient,
  input: unknown
): Promise<PurchaseRequestReceipt> {
  const params: PurchaseRequestInput = parsePurchaseRequestInput(input);
  const { data, error } = await db.rpc('submit_purchase_request', {
    p_request_id: params.requestId,
    p_artwork_id: params.artworkId,
    p_buyer_name: params.buyerName,
    p_buyer_phone: params.buyerPhone,
    p_buyer_email: params.buyerEmail,
    p_delivery_location: params.deliveryLocation,
    p_delivery_address: params.deliveryAddress,
    p_instructions: params.instructions,
  });
  if (error) {
    if (error.code === '42501') {
      throw new PurchaseWorkflowError(error.message, 403);
    }
    if (error.code === 'P0001' || error.code === '22023') {
      throw new PurchaseRequestValidationError(error.message);
    }
    if (error.code === '23505') {
      throw new PurchaseWorkflowError(error.message, 409);
    }
    throw new Error(`Unable to save purchase request: ${error.message}`);
  }
  if (!data || typeof data !== 'object') {
    throw new Error('Supabase did not return the saved purchase request.');
  }
  return fromDatabase<PurchaseRequestReceipt>(data);
}

export async function getPurchaseRequestsForCollector(collectorId: string) {
  const requests = await many<DbRow>(
    getSupabaseServiceClient()
      .from('purchase_requests')
      .select('id,artwork_id,artwork_title,artwork_image,artist_name,amount,currency,status,created_at,admin_decided_at')
      .eq('collector_id', collectorId)
      .order('created_at', { ascending: false })
      .limit(100)
  );
  return requests.map((request) => fromDatabase(request));
}

export async function getPurchasesForCollector(
  db: SupabaseDataClient,
  collectorId: string
): Promise<{ purchases: Purchase[]; artworks: Artwork[] }> {
  const purchases = await many<Purchase>(
    db.from('purchases').select('*').eq('collector_id', collectorId).order('purchased_at', { ascending: false })
  );
  if (!purchases.length) return { purchases: [], artworks: [] };
  const artworks = await many<Artwork>(
    db
      .from('artworks')
      .select('*')
      .in('id', purchases.map((purchase) => purchase.artworkId))
  );
  return {
    purchases: purchases.map((purchase) => fromDatabase(purchase)),
    artworks: artworks.map((artwork) => fromDatabase(artwork)),
  };
}

export async function getNotificationsForUser(db: SupabaseDataClient, userId: string) {
  const notifications = await many<DbRow>(
    db
      .from('notifications')
      .select('*')
      .eq('recipient_id', userId)
      .order('created_at', { ascending: false })
      .limit(50)
  );
  return notifications.map((notification) => fromDatabase(notification));
}

export async function markNotificationRead(
  db: SupabaseDataClient,
  userId: string,
  notificationId: string
) {
  const notification = await one<DbRow>(
    db
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId)
      .eq('recipient_id', userId)
      .select('*')
      .maybeSingle()
  );
  if (!notification) throw new Error('Notification not found.');
  return notification;
}

export async function getPurchasedArtworkIds(db: SupabaseDataClient, collectorId: string): Promise<string[]> {
  const purchases = await many<DbRow>(
    db.from('purchases').select('artwork_id').eq('collector_id', collectorId)
  );
  return purchases.map((purchase) => String(purchase.artwork_id));
}

export async function checkArtworkPurchased(
  db: SupabaseDataClient,
  artworkId: string,
  collectorId: string
): Promise<boolean> {
  return Boolean(
    await one<DbRow>(
      db.from('purchases').select('id').eq('artwork_id', artworkId).eq('collector_id', collectorId).maybeSingle()
    )
  );
}

// ============================================
// Donations
// ============================================

export async function createDonationInDb(
  db: SupabaseDataClient,
  donorUid: string,
  payload: DonationInput
) {
  const amount = Number(payload.amount);
  if (!Number.isFinite(amount) || amount <= 0) throw new Error('Donation amount must be positive.');
  const currency = payload.currency || 'USD';

  const inserted = await one<DbRow>(
    db
      .from('donations')
      .insert({
        id: `don-${randomUUID()}`,
        donor_id: donorUid,
        artist_id: payload.artistId || null,
        artwork_id: payload.artworkId || null,
        amount: Math.round(amount),
        currency,
        message: payload.message?.trim() || null,
        is_anonymous: Boolean(payload.isAnonymous),
        status: 'completed',
      })
      .select('*')
      .single()
  );
  return fromDatabase<Donation>(inserted);
}

export async function getDonationsForDonor(db: SupabaseDataClient, donorId: string) {
  return many<DbRow>(
    db.from('donations').select('*').eq('donor_id', donorId).order('created_at', { ascending: false })
  );
}

export async function getDonationsForArtist(db: SupabaseDataClient, artistId: string) {
  return many<DbRow>(
    db.from('donations').select('*').eq('artist_id', artistId).order('created_at', { ascending: false })
  );
}

export async function getAllDonations(db: SupabaseDataClient) {
  return many<DbRow>(db.from('donations').select('*').order('created_at', { ascending: false }));
}

// ============================================
// Exhibitions
// ============================================

export async function createExhibitionInDb(
  db: SupabaseDataClient,
  curatorUid: string,
  payload: ExhibitionInput
) {
  const inserted = await one<DbRow>(
    db
      .from('exhibitions')
      .insert({
        id: `exh-${randomUUID()}`,
        title: payload.title.trim(),
        description: payload.description?.trim() || '',
        curator_id: curatorUid,
        cover_image_key: payload.coverImageKey || null,
        start_date: payload.startDate,
        end_date: payload.endDate,
        location: payload.location || null,
        is_virtual: Boolean(payload.isVirtual),
        virtual_url: payload.virtualUrl || null,
        status: payload.status || 'draft',
        featured: Boolean(payload.featured),
      })
      .select('*')
      .single()
  );
  return fromDatabase<Exhibition>(inserted);
}

export async function getExhibitions(db: SupabaseDataClient, status?: ExhibitionStatus) {
  let query = db.from('exhibitions').select('*').order('start_date', { ascending: true });
  if (status) query = query.eq('status', status);
  return many<DbRow>(query);
}

export async function getExhibitionById(db: SupabaseDataClient, exhibitionId: string) {
  return one<DbRow>(db.from('exhibitions').select('*').eq('id', exhibitionId).maybeSingle());
}

export async function updateExhibitionInDb(
  db: SupabaseDataClient,
  exhibitionId: string,
  curatorUid: string,
  payload: Partial<ExhibitionInput>
) {
  const existing = await one<DbRow>(db.from('exhibitions').select('*').eq('id', exhibitionId).maybeSingle());
  if (!existing) throw new Error('Exhibition not found.');
  if (String(existing.curator_id) !== curatorUid) {
    throw new Error('Forbidden: Only the curator may update this exhibition.');
  }
  const updated = await one<DbRow>(
    db
      .from('exhibitions')
      .update({
        ...(payload.title !== undefined ? { title: payload.title.trim() } : {}),
        ...(payload.description !== undefined ? { description: payload.description } : {}),
        ...(payload.coverImageKey !== undefined ? { cover_image_key: payload.coverImageKey } : {}),
        ...(payload.startDate !== undefined ? { start_date: payload.startDate } : {}),
        ...(payload.endDate !== undefined ? { end_date: payload.endDate } : {}),
        ...(payload.location !== undefined ? { location: payload.location } : {}),
        ...(payload.isVirtual !== undefined ? { is_virtual: payload.isVirtual } : {}),
        ...(payload.virtualUrl !== undefined ? { virtual_url: payload.virtualUrl } : {}),
        ...(payload.status !== undefined ? { status: payload.status } : {}),
        ...(payload.featured !== undefined ? { featured: payload.featured } : {}),
        updated_at: new Date().toISOString(),
      })
      .eq('id', exhibitionId)
      .select('*')
      .single()
  );
  return fromDatabase<Exhibition>(updated);
}

export async function deleteExhibitionInDb(db: SupabaseDataClient, exhibitionId: string, curatorUid: string) {
  const existing = await one<DbRow>(db.from('exhibitions').select('curator_id').eq('id', exhibitionId).maybeSingle());
  if (!existing) throw new Error('Exhibition not found.');
  if (String(existing.curator_id) !== curatorUid) {
    throw new Error('Forbidden: Only the curator may delete this exhibition.');
  }
  await execute(db.from('exhibitions').delete().eq('id', exhibitionId));
  return { deletedId: exhibitionId };
}

export async function getExhibitionArtworks(db: SupabaseDataClient, exhibitionId: string) {
  return many<DbRow>(
    db
      .from('exhibition_artworks')
      .select('*, artworks(*)')
      .eq('exhibition_id', exhibitionId)
      .order('display_order', { ascending: true })
  );
}

export async function addArtworkToExhibition(db: SupabaseDataClient, exhibitionId: string, artworkId: string) {
  const exhibition = await one<DbRow>(db.from('exhibitions').select('id').eq('id', exhibitionId).maybeSingle());
  if (!exhibition) throw new Error('Exhibition not found.');
  const artwork = await one<DbRow>(db.from('artworks').select('id').eq('id', artworkId).maybeSingle());
  if (!artwork) throw new Error('Artwork not found.');
  const inserted = await one<DbRow>(
    db
      .from('exhibition_artworks')
      .insert({ exhibition_id: exhibitionId, artwork_id: artworkId })
      .select('*')
      .single()
  );
  return fromDatabase(inserted);
}

export async function removeArtworkFromExhibition(db: SupabaseDataClient, exhibitionId: string, artworkId: string) {
  await execute(
    db.from('exhibition_artworks').delete().eq('exhibition_id', exhibitionId).eq('artwork_id', artworkId)
  );
  return { removed: true };
}

// ============================================
// Exhibition Submissions
// ============================================

export async function createExhibitionSubmissionInDb(
  db: SupabaseDataClient,
  artistUid: string,
  payload: ExhibitionSubmissionInput
) {
  const exhibition = await one<DbRow>(db.from('exhibitions').select('id,status').eq('id', payload.exhibitionId).maybeSingle());
  if (!exhibition) throw new Error('Exhibition not found.');
  const artwork = await one<DbRow>(db.from('artworks').select('id,artist_id').eq('id', payload.artworkId).maybeSingle());
  if (!artwork) throw new Error('Artwork not found.');
  if (String(artwork.artist_id) !== artistUid) {
    throw new Error('Forbidden: Only the artwork artist may submit it.');
  }

  const inserted = await one<DbRow>(
    db
      .from('exhibition_submissions')
      .insert({
        id: `sub-${randomUUID()}`,
        exhibition_id: payload.exhibitionId,
        artist_id: artistUid,
        artwork_id: payload.artworkId,
        curator_notes: payload.curatorNotes?.trim() || null,
        status: 'submitted',
      })
      .select('*')
      .single()
  );
  return fromDatabase<ExhibitionSubmission>(inserted);
}

export async function getExhibitionSubmissions(db: SupabaseDataClient, exhibitionId: string) {
  return many<DbRow>(
    db.from('exhibition_submissions').select('*').eq('exhibition_id', exhibitionId).order('submitted_at', { ascending: false })
  );
}

export async function updateExhibitionSubmissionStatus(
  db: SupabaseDataClient,
  submissionId: string,
  curatorUid: string,
  status: ExhibitionSubmissionStatus,
  notes?: string
) {
  const submission = await one<DbRow>(
    db.from('exhibition_submissions').select('*, exhibitions(curator_id)').eq('id', submissionId).maybeSingle()
  );
  if (!submission) throw new Error('Submission not found.');
  const exhibition = (submission as unknown as { exhibitions?: { curator_id: string } }).exhibitions;
  if (!exhibition || String(exhibition.curator_id) !== curatorUid) {
    throw new Error('Forbidden: Only the exhibition curator may review submissions.');
  }
  const updated = await one<DbRow>(
    db
      .from('exhibition_submissions')
      .update({
        status,
        ...(notes !== undefined ? { curator_notes: notes } : {}),
        ...(status === 'accepted' || status === 'rejected' ? { reviewed_at: new Date().toISOString(), reviewed_by: curatorUid } : {}),
      })
      .eq('id', submissionId)
      .select('*')
      .single()
  );
  return fromDatabase<ExhibitionSubmission>(updated);
}
