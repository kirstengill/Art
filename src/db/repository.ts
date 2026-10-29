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
  if (!imageKey || imageKey.startsWith('data:image/')) {
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

  const visibleProfiles = profileRows.filter((profile) => !profile.is_demo);
  const visibleProfileIds = new Set(visibleProfiles.map((profile) => profile.id));
  const visibleArtworks = artworkRows.filter(
    (artwork) => !artwork.is_demo && visibleProfileIds.has(String(artwork.artist_id))
  );
  const visibleArtworkIds = new Set(visibleArtworks.map((artwork) => artwork.id));
  const visiblePosts = postRows.filter(
    (post) => !post.is_demo && visibleProfileIds.has(String(post.author_id))
  );
  const visiblePostIds = new Set(visiblePosts.map((post) => post.id));

  return {
    profiles: visibleProfiles.map((profile) => ({
      ...fromDatabase<DbRow>(profile),
      email: '',
    })),
    artworks: visibleArtworks.map((artwork) => fromDatabase(artwork)),
    posts: visiblePosts.map((post) => fromDatabase(post)),
    comments: commentRows
      .filter(
        (comment) =>
          visiblePostIds.has(String(comment.post_id)) &&
          visibleProfileIds.has(String(comment.author_id))
      )
      .map((comment) => fromDatabase(comment)),
    followedArtistIds: followRows
      .filter((follow) => visibleProfileIds.has(String(follow.following_id)))
      .map((follow) => String(follow.following_id)),
    likedPostIds: likeRows
      .filter((like) => visiblePostIds.has(String(like.post_id)))
      .map((like) => String(like.post_id)),
    savedArtworkIds: savedRows
      .map((item) => String(item.artwork_id))
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
  const categories = ['painting', 'photography', 'sculpture', 'drawing', 'digital_art'];
  const saleModes = ['buy_now', 'negotiation_only', 'buy_now_and_negotiation'];
  const availability = ['available', 'reserved', 'sold'];
  if (!categories.includes(payload.category)) throw new Error('Invalid artwork category.');
  if (!saleModes.includes(payload.saleMode)) throw new Error('Invalid sale mode.');
  if (!availability.includes(payload.availability)) throw new Error('Invalid availability status.');
  requireImageKey(payload.imageKey);

  const values = {
    title: payload.title.trim(),
    description: payload.description.trim(),
    category: payload.category,
    medium: payload.medium.trim(),
    dimensions: payload.dimensions.trim(),
    year: payload.year,
    price: payload.price,
    currency: payload.currency || 'USD',
    availability: payload.availability,
    saleMode: payload.saleMode,
    imageKey: payload.imageKey,
    provenance: payload.provenance?.trim() || 'Direct from the artist studio',
    editionInfo: payload.editionInfo?.trim() || 'Unique 1 of 1 original work',
  };

  if (payload.id) {
    const existing = await one<DbRow>(db.from('artworks').select('*').eq('id', payload.id).maybeSingle());
    if (!existing) throw new Error('Artwork listing not found.');
    if (existing.artist_id !== ownerUid) {
      throw new Error('Forbidden: Only the creator artist may edit this artwork.');
    }
    values.provenance = payload.provenance?.trim() || String(existing.provenance);
    values.editionInfo = payload.editionInfo?.trim() || String(existing.edition_info);
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
  if (artwork.is_demo) throw new Error('This artwork is not available for inquiries.');
  if (artwork.artist_id !== ownerUid) {
    throw new Error('Forbidden: Only the artwork owner may delete this listing.');
  }
  const objectPath = storageObjectPath(String(artwork.image_key || ''));
  if (objectPath) {
    const { error } = await db.storage.from('artwork-images').remove([objectPath]);
    if (error) throw new Error(`Unable to remove artwork image: ${error.message}`);
  }
  await execute(db.from('artworks').delete().eq('id', artworkId).eq('artist_id', ownerUid));
  return { deletedId: artworkId };
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
  const profile = await one<DbRow>(db.from('profiles').select('role').eq('id', collectorUid).maybeSingle());
  if (!profile || !['collector', 'art_lover'].includes(String(profile.role))) {
    throw new Error('Forbidden: A collector or art lover account is required.');
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
  const profile = await one<DbRow>(db.from('profiles').select('role').eq('id', params.senderUid).maybeSingle());
  if (profile?.role !== 'collector') throw new Error('Forbidden: Only collector accounts may submit new offers.');
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
  const buyer = await one<DbRow>(db.from('profiles').select('role').eq('id', params.buyerUid).maybeSingle());
  if (buyer?.role !== 'collector') throw new Error('Forbidden: A collector account is required to create a purchase intent.');
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

export async function getPurchasesForCollector(db: SupabaseDataClient, collectorId: string) {
  const purchases = await many<DbRow>(
    db.from('purchases').select('*').eq('collector_id', collectorId).order('purchased_at', { ascending: false })
  );
  if (!purchases.length) return { purchases: [], artworks: [] };
  const artworks = await many(
    db.from('artworks').select('*').in('id', purchases.map((purchase) => String(purchase.artwork_id)))
  );
  return {
    purchases: purchases.map((purchase) => fromDatabase(purchase)),
    artworks: artworks.map((artwork) => fromDatabase(artwork)),
  };
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
