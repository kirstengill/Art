import { and, desc, eq, inArray, or } from 'drizzle-orm';
import { db } from './index.ts';
import {
  artworkOffers,
  artworks,
  collectionItems,
  collections,
  comments,
  conversationParticipants,
  conversations,
  follows,
  likes,
  messages,
  orders,
  posts,
  profiles,
  purchases,
  users,
  userAccountDetails,
} from './schema.ts';

function sanitizeHandle(input: string): string {
  const cleaned = input
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '')
    .slice(0, 28);
  return cleaned || 'collector';
}

async function savePrivateAccountDetails(params: {
  uid: string;
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  location?: string;
}) {
  if (!params.firstName || !params.lastName || !params.phoneNumber) return;
  await db
    .insert(userAccountDetails)
    .values({
      userId: params.uid,
      firstName: params.firstName.trim(),
      lastName: params.lastName.trim(),
      phoneNumber: params.phoneNumber.trim(),
      location: params.location?.trim() || null,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: userAccountDetails.userId,
      set: {
        firstName: params.firstName.trim(),
        lastName: params.lastName.trim(),
        phoneNumber: params.phoneNumber.trim(),
        location: params.location?.trim() || null,
        updatedAt: new Date(),
      },
    });
}

export async function syncUserProfile(params: {
  uid: string;
  email: string;
  fullName?: string;
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  role?: string;
  bio?: string;
  location?: string;
  isAdmin?: boolean;
}) {
  try {
    const validRoles = ['artist', 'collector', 'art_lover'];
    const safeRole = params.role && validRoles.includes(params.role) ? params.role : undefined;
    const accountRole = params.isAdmin ? 'admin' : safeRole;

    await db
      .insert(users)
      .values({
        uid: params.uid,
        email: params.email,
      })
      .onConflictDoUpdate({
        target: users.uid,
        set: { email: params.email },
      });

    const existing = await db
      .select()
      .from(profiles)
      .where(eq(profiles.id, params.uid));

    if (existing.length > 0) {
      const current = existing[0];
      const defaultName = params.fullName?.trim() || current.fullName;
      const username = sanitizeHandle(defaultName);
      const role = params.isAdmin ? 'admin' : safeRole || current.role;
      
      const updated = await db
        .update(profiles)
        .set({
          email: params.email,
          fullName: defaultName,
          handle: sanitizeHandle(defaultName),
          username: username,
          role,
          accountStatus: 'active',
          registrationDate: current.registrationDate || current.createdAt,
          bio: params.bio !== undefined ? params.bio : current.bio,
          location:
            role === 'artist' && params.location !== undefined
              ? params.location
              : role === 'artist'
                ? current.location
                : '',
          updatedAt: new Date(),
        })
        .where(eq(profiles.id, params.uid))
        .returning();
      await savePrivateAccountDetails(params);
      return updated[0];
    }

    const defaultName =
      params.fullName?.trim() ||
      params.email.split('@')[0].replace(/[._-]/g, ' ');
    const username = sanitizeHandle(defaultName);
    
    const inserted = await db
      .insert(profiles)
      .values({
        id: params.uid,
        email: params.email,
        fullName: defaultName,
        handle: sanitizeHandle(defaultName),
        username: username,
        role: accountRole || 'collector',
        accountStatus: 'active',
        registrationDate: new Date(),
        bio: params.bio || 'Member of the ARTIVORA collecting community.',
        location: safeRole === 'artist' ? params.location || 'International' : '',
        discipline: safeRole === 'artist' ? 'Contemporary Fine Art' : 'Private Collection',
        verified: false,
        isDemo: false,
      })
      .onConflictDoUpdate({
        target: profiles.id,
        set: { 
          email: params.email, 
          fullName: defaultName,
          handle: sanitizeHandle(defaultName),
          username: username,
          updatedAt: new Date() 
        },
      })
      .returning();

    await savePrivateAccountDetails(params);

    return inserted[0];
  } catch (error) {
    console.error('Database syncUserProfile failed:', error);
    throw new Error('Unable to synchronize user profile at this time.', { cause: error });
  }
}

export async function getArtists() {
  try {
    const artists = await db
      .select({
        id: profiles.id,
        fullName: profiles.fullName,
        handle: profiles.handle,
        username: profiles.username,
        role: profiles.role,
        accountStatus: profiles.accountStatus,
        registrationDate: profiles.registrationDate,
        avatarUrl: profiles.avatarUrl,
        coverUrl: profiles.coverUrl,
        bio: profiles.bio,
        location: profiles.location,
        discipline: profiles.discipline,
        verified: profiles.verified,
        createdAt: profiles.createdAt,
        updatedAt: profiles.updatedAt,
      })
      .from(profiles)
      .where(
        and(
          eq(profiles.role, 'artist'),
          eq(profiles.accountStatus, 'active'),
          eq(profiles.isDemo, false)
        )
      )
      .orderBy(desc(profiles.createdAt));
    return artists;
  } catch (error) {
    console.error('Database getArtists failed:', error);
    throw new Error('Unable to load artists.', { cause: error });
  }
}

export async function getPublicCatalog(viewerUid?: string) {
  try {
    const [
      allProfiles,
      allArtworks,
      allPosts,
      allComments,
      allFollows,
      allLikes,
      viewerCollections,
    ] = await Promise.all([
      db.select().from(profiles).orderBy(desc(profiles.createdAt)),
      db.select().from(artworks).orderBy(desc(artworks.createdAt)),
      db.select().from(posts).orderBy(desc(posts.createdAt)),
      db.select().from(comments).orderBy(comments.createdAt),
      viewerUid
        ? db.select().from(follows).where(eq(follows.followerId, viewerUid))
        : Promise.resolve([]),
      viewerUid
        ? db.select().from(likes).where(eq(likes.userId, viewerUid))
        : Promise.resolve([]),
      viewerUid
        ? db.select().from(collections).where(eq(collections.ownerId, viewerUid))
        : Promise.resolve([]),
    ]);

    let savedArtworkIds: string[] = [];
    if (viewerUid && viewerCollections.length > 0) {
      const items = await db
        .select()
        .from(collectionItems)
        .where(eq(collectionItems.collectionId, viewerCollections[0].id));
      savedArtworkIds = items.map((item) => item.artworkId);
    }

    const visibleProfiles = allProfiles.filter((profile) => !profile.isDemo);
    const visibleProfileIds = new Set(visibleProfiles.map((profile) => profile.id));
    const visibleArtworks = allArtworks.filter(
      (artwork) => !artwork.isDemo && visibleProfileIds.has(artwork.artistId)
    );
    const visibleArtworkIds = new Set(visibleArtworks.map((artwork) => artwork.id));
    const visiblePosts = allPosts.filter(
      (post) => !post.isDemo && visibleProfileIds.has(post.authorId)
    );
    const visiblePostIds = new Set(visiblePosts.map((post) => post.id));

    return {
      profiles: visibleProfiles.map((profile) => ({ ...profile, email: '' })),
      artworks: visibleArtworks,
      posts: visiblePosts,
      comments: allComments.filter(
        (comment) =>
          visiblePostIds.has(comment.postId) &&
          visibleProfileIds.has(comment.authorId)
      ),
      followedArtistIds: allFollows
        .filter((follow) => visibleProfileIds.has(follow.followingId))
        .map((follow) => follow.followingId),
      likedPostIds: allLikes
        .filter((like) => visiblePostIds.has(like.postId))
        .map((like) => like.postId),
      savedArtworkIds: savedArtworkIds.filter((id) => visibleArtworkIds.has(id)),
    };
  } catch (error) {
    console.error('Database getPublicCatalog failed:', error);
    throw new Error('Unable to load gallery catalog right now.', { cause: error });
  }
}

export async function upsertArtworkListing(
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
  try {
    const [ownerProfile] = await db
      .select()
      .from(profiles)
      .where(eq(profiles.id, ownerUid));
    if (ownerProfile?.role !== 'artist') {
      throw new Error('Forbidden: Only artist accounts may publish artwork.');
    }

    const validCategories = ['painting', 'photography', 'sculpture', 'drawing', 'digital_art'];
    const validSaleModes = ['buy_now', 'negotiation_only', 'buy_now_and_negotiation'];
    const validAvailability = ['available', 'reserved', 'sold'];

    if (!validCategories.includes(payload.category)) {
      throw new Error('Invalid artwork category.');
    }
    if (!validSaleModes.includes(payload.saleMode)) {
      throw new Error('Invalid sale mode.');
    }
    if (!validAvailability.includes(payload.availability)) {
      throw new Error('Invalid availability status.');
    }
    if (payload.imageKey.startsWith('data:image/')) {
      throw new Error('Artwork images must be uploaded to Supabase Storage before publishing.');
    }

    if (payload.id) {
      const existing = await db
        .select()
        .from(artworks)
        .where(eq(artworks.id, payload.id));
      if (existing.length === 0) {
        throw new Error('Artwork listing not found.');
      }
      if (existing[0].artistId !== ownerUid) {
        throw new Error('Forbidden: Only the creator artist may edit this artwork.');
      }

      const updated = await db
        .update(artworks)
        .set({
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
          provenance: payload.provenance?.trim() || existing[0].provenance,
          editionInfo: payload.editionInfo?.trim() || existing[0].editionInfo,
          updatedAt: new Date(),
        })
        .where(eq(artworks.id, payload.id))
        .returning();
      return updated[0];
    }

    const newId = `art-${Date.now().toString(36)}`;
    const accessionNumber = `AV-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`;

    const created = await db
      .insert(artworks)
      .values({
        id: newId,
        artistId: ownerUid,
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
        accessionNumber,
        editionInfo: payload.editionInfo?.trim() || 'Unique 1 of 1 original work',
        featured: false,
        likesCount: 0,
        isDemo: false,
      })
      .returning();

    return created[0];
  } catch (error) {
    console.error('Database upsertArtworkListing failed:', error);
    if (error instanceof Error && error.message.startsWith('Forbidden:')) {
      throw error;
    }
    throw new Error('Failed to save artwork listing.', { cause: error });
  }
}

export async function removeArtworkListing(ownerUid: string, artworkId: string) {
  try {
    const existing = await db
      .select()
      .from(artworks)
      .where(eq(artworks.id, artworkId));
    if (existing.length === 0) {
      throw new Error('Artwork not found.');
    }
    if (existing[0].artistId !== ownerUid) {
      throw new Error('Forbidden: Only the artwork owner may delete this listing.');
    }
    await db.delete(artworks).where(eq(artworks.id, artworkId));
    return { deletedId: artworkId };
  } catch (error) {
    console.error('Database removeArtworkListing failed:', error);
    if (error instanceof Error && error.message.startsWith('Forbidden:')) {
      throw error;
    }
    throw new Error('Failed to delete artwork listing.', { cause: error });
  }
}

export async function toggleSavedArtworkInDb(ownerUid: string, artworkId: string) {
  try {
    let userCols = await db
      .select()
      .from(collections)
      .where(eq(collections.ownerId, ownerUid));

    if (userCols.length === 0) {
      userCols = await db
        .insert(collections)
        .values({
          id: `col-${ownerUid.slice(0, 12)}`,
          ownerId: ownerUid,
          title: 'Saved Works',
          description: 'Private shortlist of collected and watched works.',
          isPublic: false,
        })
        .returning();
    }

    const colId = userCols[0].id;
    const existing = await db
      .select()
      .from(collectionItems)
      .where(
        and(
          eq(collectionItems.collectionId, colId),
          eq(collectionItems.artworkId, artworkId)
        )
      );

    if (existing.length > 0) {
      await db
        .delete(collectionItems)
        .where(eq(collectionItems.id, existing[0].id));
      return { saved: false };
    }

    await db.insert(collectionItems).values({
      collectionId: colId,
      artworkId,
    });
    return { saved: true };
  } catch (error) {
    console.error('Database toggleSavedArtworkInDb failed:', error);
    throw new Error('Unable to update collection right now.', { cause: error });
  }
}

export async function toggleFollowInDb(followerUid: string, artistId: string) {
  try {
    const existing = await db
      .select()
      .from(follows)
      .where(
        and(eq(follows.followerId, followerUid), eq(follows.followingId, artistId))
      );

    if (existing.length > 0) {
      await db.delete(follows).where(eq(follows.id, existing[0].id));
      return { following: false };
    }

    await db.insert(follows).values({
      followerId: followerUid,
      followingId: artistId,
    });
    return { following: true };
  } catch (error) {
    console.error('Database toggleFollowInDb failed:', error);
    throw new Error('Unable to update artist follow status.', { cause: error });
  }
}

export async function createPostInDb(
  authorUid: string,
  payload: { title: string; body: string; artworkId?: string; imageKey?: string }
) {
  try {
    const id = `post-${Date.now().toString(36)}`;
    const inserted = await db
      .insert(posts)
      .values({
        id,
        authorId: authorUid,
        artworkId: payload.artworkId || null,
        title: payload.title.trim(),
        body: payload.body.trim(),
        imageKey: payload.imageKey || null,
        likesCount: 0,
        commentsCount: 0,
        isDemo: false,
      })
      .returning();
    return inserted[0];
  } catch (error) {
    console.error('Database createPostInDb failed:', error);
    throw new Error('Unable to publish community post.', { cause: error });
  }
}

export async function addCommentInDb(authorUid: string, postId: string, body: string) {
  try {
    const targetPosts = await db.select().from(posts).where(eq(posts.id, postId));
    if (targetPosts.length === 0) {
      throw new Error('Post not found.');
    }
    const commentId = `comment-${Date.now().toString(36)}`;
    const inserted = await db
      .insert(comments)
      .values({
        id: commentId,
        postId,
        authorId: authorUid,
        body: body.trim(),
      })
      .returning();

    await db
      .update(posts)
      .set({ commentsCount: targetPosts[0].commentsCount + 1 })
      .where(eq(posts.id, postId));

    return inserted[0];
  } catch (error) {
    console.error('Database addCommentInDb failed:', error);
    throw new Error('Unable to post comment.', { cause: error });
  }
}

export async function togglePostLikeInDb(userUid: string, postId: string) {
  try {
    const targetPosts = await db.select().from(posts).where(eq(posts.id, postId));
    if (targetPosts.length === 0) {
      throw new Error('Post not found.');
    }
    const existing = await db
      .select()
      .from(likes)
      .where(and(eq(likes.postId, postId), eq(likes.userId, userUid)));

    if (existing.length > 0) {
      await db.delete(likes).where(eq(likes.id, existing[0].id));
      const nextCount = Math.max(0, targetPosts[0].likesCount - 1);
      await db.update(posts).set({ likesCount: nextCount }).where(eq(posts.id, postId));
      return { liked: false, likesCount: nextCount };
    }

    await db.insert(likes).values({ postId, userId: userUid });
    const nextCount = targetPosts[0].likesCount + 1;
    await db.update(posts).set({ likesCount: nextCount }).where(eq(posts.id, postId));
    return { liked: true, likesCount: nextCount };
  } catch (error) {
    console.error('Database togglePostLikeInDb failed:', error);
    throw new Error('Unable to update post appreciation.', { cause: error });
  }
}

export async function getConversationsForParticipant(uid: string) {
  try {
    // Strictly return only conversations where uid is collector or artist participant
    const userConvs = await db
      .select()
      .from(conversations)
      .where(or(eq(conversations.collectorId, uid), eq(conversations.artistId, uid)))
      .orderBy(desc(conversations.lastMessageAt));

    const visibleConversations = userConvs.filter((conversation) => !conversation.isDemo);
    if (visibleConversations.length === 0) {
      return { conversations: [], messages: [], offers: [] };
    }

    const convIds = visibleConversations.map((c) => c.id);
    const allMsgs = await db.select().from(messages).orderBy(messages.createdAt);
    const allOffers = await db
      .select()
      .from(artworkOffers)
      .orderBy(artworkOffers.createdAt);

    return {
      conversations: visibleConversations,
      messages: allMsgs.filter((m) => convIds.includes(m.conversationId)),
      offers: allOffers.filter((o) => convIds.includes(o.conversationId)),
    };
  } catch (error) {
    console.error('Database getConversationsForParticipant failed:', error);
    throw new Error('Unable to load private conversations.', { cause: error });
  }
}

export async function getOrCreateArtworkConversation(
  collectorUid: string,
  artworkId: string
) {
  try {
    const [collectorProfile] = await db
      .select()
      .from(profiles)
      .where(eq(profiles.id, collectorUid));
    if (!collectorProfile || !['collector', 'art_lover'].includes(collectorProfile.role)) {
      throw new Error('Forbidden: A collector or art lover account is required.');
    }

    const targetArt = await db
      .select()
      .from(artworks)
      .where(eq(artworks.id, artworkId));
    if (targetArt.length === 0) {
      throw new Error('Artwork not found.');
    }
    const art = targetArt[0];

    const existing = await db
      .select()
      .from(conversations)
      .where(
        and(
          eq(conversations.artworkId, artworkId),
          eq(conversations.collectorId, collectorUid)
        )
      );

    if (existing.length > 0) {
      return existing[0];
    }

    const convId = `conv-${Date.now().toString(36)}`;
    const created = await db
      .insert(conversations)
      .values({
        id: convId,
        artworkId,
        collectorId: collectorUid,
        artistId: art.artistId,
        lastMessagePreview: `Inquiry opened regarding ${art.title}`,
        isDemo: art.isDemo,
      })
      .returning();

    await db
      .insert(conversationParticipants)
      .values([
        { conversationId: convId, profileId: collectorUid, unreadCount: 0 },
        { conversationId: convId, profileId: art.artistId, unreadCount: 1 },
      ])
      .onConflictDoNothing();

    return created[0];
  } catch (error) {
    console.error('Database getOrCreateArtworkConversation failed:', error);
    if (error instanceof Error && error.message.startsWith('Forbidden:')) {
      throw error;
    }
    throw new Error('Unable to open artwork inquiry.', { cause: error });
  }
}

export async function appendMessageToDb(
  senderUid: string,
  conversationId: string,
  body: string,
  attachmentName?: string
) {
  try {
    const convRows = await db
      .select()
      .from(conversations)
      .where(eq(conversations.id, conversationId));
    if (convRows.length === 0) {
      throw new Error('Conversation not found.');
    }
    const conv = convRows[0];
    if (conv.collectorId !== senderUid && conv.artistId !== senderUid) {
      throw new Error('Forbidden: Only conversation participants can send messages.');
    }

    const msgId = `msg-${Date.now().toString(36)}`;
    const inserted = await db
      .insert(messages)
      .values({
        id: msgId,
        conversationId,
        senderId: senderUid,
        body: body.trim(),
        attachmentName: attachmentName || null,
        messageType: 'text',
      })
      .returning();

    await db
      .update(conversations)
      .set({
        lastMessagePreview: body.trim().slice(0, 140),
        lastMessageAt: new Date(),
      })
      .where(eq(conversations.id, conversationId));

    return inserted[0];
  } catch (error) {
    console.error('Database appendMessageToDb failed:', error);
    if (error instanceof Error && error.message.startsWith('Forbidden:')) {
      throw error;
    }
    throw new Error('Unable to send message.', { cause: error });
  }
}

export async function createOfferInDb(params: {
  senderUid: string;
  conversationId: string;
  amount: number;
  currency: string;
  note: string;
}) {
  try {
    const convRows = await db
      .select()
      .from(conversations)
      .where(eq(conversations.id, params.conversationId));
    if (convRows.length === 0) {
      throw new Error('Conversation not found.');
    }
    const conv = convRows[0];
    if (conv.collectorId !== params.senderUid && conv.artistId !== params.senderUid) {
      throw new Error('Forbidden: Only authorized participants may submit offers.');
    }

    const [senderProfile] = await db
      .select()
      .from(profiles)
      .where(eq(profiles.id, params.senderUid));
    if (senderProfile?.role !== 'collector' || conv.collectorId !== params.senderUid) {
      throw new Error('Forbidden: Only collector accounts may submit new offers.');
    }

    const artRows = await db
      .select()
      .from(artworks)
      .where(eq(artworks.id, conv.artworkId));
    if (artRows.length === 0) {
      throw new Error('Linked artwork not found.');
    }
    if (artRows[0].saleMode === 'buy_now') {
      throw new Error('This artwork is listed for fixed-price purchase only.');
    }
    if (params.amount <= 0) {
      throw new Error('Offer amount must be positive.');
    }

    const recipientId =
      params.senderUid === conv.collectorId ? conv.artistId : conv.collectorId;
    const offerId = `offer-${Date.now().toString(36)}`;
    const inserted = await db
      .insert(artworkOffers)
      .values({
        id: offerId,
        conversationId: conv.id,
        artworkId: conv.artworkId,
        senderId: params.senderUid,
        recipientId,
        amount: Math.round(params.amount),
        currency: params.currency || artRows[0].currency,
        status: 'pending',
        note: params.note.trim(),
      })
      .returning();

    const eventSummary = `Proposed an offer of $${Math.round(params.amount).toLocaleString()} ${params.currency || 'USD'}${params.note.trim() ? ` · "${params.note.trim()}"` : ''}`;
    await db.insert(messages).values({
      id: `msg-${Date.now().toString(36)}-ev`,
      conversationId: conv.id,
      senderId: params.senderUid,
      body: eventSummary,
      messageType: 'offer_event',
    });

    await db
      .update(conversations)
      .set({
        lastMessagePreview: eventSummary.slice(0, 140),
        lastMessageAt: new Date(),
      })
      .where(eq(conversations.id, conv.id));

    return inserted[0];
  } catch (error) {
    console.error('Database createOfferInDb failed:', error);
    if (error instanceof Error && error.message.startsWith('Forbidden:')) {
      throw error;
    }
    throw new Error(
      error instanceof Error ? error.message : 'Unable to submit offer.',
      { cause: error }
    );
  }
}

export async function transitionOfferStatusInDb(params: {
  actorUid: string;
  offerId: string;
  action: 'accept' | 'reject' | 'withdraw' | 'counter';
  counterAmount?: number;
  note?: string;
}) {
  try {
    const offerRows = await db
      .select()
      .from(artworkOffers)
      .where(eq(artworkOffers.id, params.offerId));
    if (offerRows.length === 0) {
      throw new Error('Offer not found.');
    }
    const offer = offerRows[0];

    if (offer.status !== 'pending') {
      throw new Error(`Offer can no longer be modified (current status: ${offer.status}).`);
    }

    if (params.action === 'withdraw') {
      if (offer.senderId !== params.actorUid) {
        throw new Error('Forbidden: Only the sender of a pending offer can withdraw it.');
      }
      const updated = await db
        .update(artworkOffers)
        .set({ status: 'withdrawn', updatedAt: new Date() })
        .where(eq(artworkOffers.id, offer.id))
        .returning();

      await db.insert(messages).values({
        id: `msg-${Date.now().toString(36)}-wd`,
        conversationId: offer.conversationId,
        senderId: params.actorUid,
        body: `Withdrew offer of $${offer.amount.toLocaleString()} ${offer.currency}.`,
        messageType: 'offer_event',
      });
      return { updatedOffer: updated[0], counterOffer: null };
    }

    // Accept, Reject, or Counter may only be performed by the recipient
    if (offer.recipientId !== params.actorUid) {
      throw new Error('Forbidden: Only the offer recipient can respond to this offer.');
    }

    if (params.action === 'accept' || params.action === 'reject') {
      const nextStatus = params.action === 'accept' ? 'accepted' : 'rejected';
      const updated = await db
        .update(artworkOffers)
        .set({ status: nextStatus, updatedAt: new Date() })
        .where(eq(artworkOffers.id, offer.id))
        .returning();

      if (nextStatus === 'accepted') {
        // Reserve artwork while awaiting settlement — never automatically mark paid
        await db
          .update(artworks)
          .set({ availability: 'reserved', updatedAt: new Date() })
          .where(eq(artworks.id, offer.artworkId));
      }

      const eventText =
        nextStatus === 'accepted'
          ? `Accepted offer of $${offer.amount.toLocaleString()} ${offer.currency}. Settlement remains pending collector invoice checkout.`
          : `Declined offer of $${offer.amount.toLocaleString()} ${offer.currency}.`;

      await db.insert(messages).values({
        id: `msg-${Date.now().toString(36)}-rs`,
        conversationId: offer.conversationId,
        senderId: params.actorUid,
        body: eventText,
        messageType: 'offer_event',
      });

      await db
        .update(conversations)
        .set({ lastMessagePreview: eventText, lastMessageAt: new Date() })
        .where(eq(conversations.id, offer.conversationId));

      return { updatedOffer: updated[0], counterOffer: null };
    }

    // Counteroffer
    if (!params.counterAmount || params.counterAmount <= 0) {
      throw new Error('Valid counteroffer amount is required.');
    }

    const markedCountered = await db
      .update(artworkOffers)
      .set({ status: 'countered', updatedAt: new Date() })
      .where(eq(artworkOffers.id, offer.id))
      .returning();

    const counterId = `offer-${Date.now().toString(36)}-ct`;
    const newCounter = await db
      .insert(artworkOffers)
      .values({
        id: counterId,
        conversationId: offer.conversationId,
        artworkId: offer.artworkId,
        senderId: params.actorUid,
        recipientId: offer.senderId,
        amount: Math.round(params.counterAmount),
        currency: offer.currency,
        status: 'pending',
        note: params.note?.trim() || '',
        parentOfferId: offer.id,
      })
      .returning();

    const counterText = `Countered at $${Math.round(params.counterAmount).toLocaleString()} ${offer.currency}${params.note?.trim() ? ` · "${params.note.trim()}"` : ''}`;
    await db.insert(messages).values({
      id: `msg-${Date.now().toString(36)}-ct`,
      conversationId: offer.conversationId,
      senderId: params.actorUid,
      body: counterText,
      messageType: 'offer_event',
    });

    await db
      .update(conversations)
      .set({ lastMessagePreview: counterText.slice(0, 140), lastMessageAt: new Date() })
      .where(eq(conversations.id, offer.conversationId));

    return { updatedOffer: markedCountered[0], counterOffer: newCounter[0] };
  } catch (error) {
    console.error('Database transitionOfferStatusInDb failed:', error);
    if (error instanceof Error && error.message.startsWith('Forbidden:')) {
      throw error;
    }
    throw new Error(
      error instanceof Error ? error.message : 'Unable to update offer state.',
      { cause: error }
    );
  }
}

export async function createPurchaseIntentInDb(params: {
  buyerUid: string;
  artworkId: string;
  offerId?: string;
  shippingCity: string;
  collectorNote: string;
}) {
  try {
    const [buyerProfile] = await db
      .select()
      .from(profiles)
      .where(eq(profiles.id, params.buyerUid));
    if (!buyerProfile || buyerProfile.role !== 'collector') {
      throw new Error('Forbidden: A collector account is required to create a purchase intent.');
    }

    const artRows = await db
      .select()
      .from(artworks)
      .where(eq(artworks.id, params.artworkId));
    if (artRows.length === 0) {
      throw new Error('Artwork not found.');
    }
    const art = artRows[0];

    let verifiedPrice = art.price;
    if (params.offerId) {
      const offerRows = await db
        .select()
        .from(artworkOffers)
        .where(eq(artworkOffers.id, params.offerId));
      if (offerRows.length === 0 || offerRows[0].status !== 'accepted') {
        throw new Error('Referenced offer must be accepted before creating an invoice intent.');
      }
      verifiedPrice = offerRows[0].amount;
    } else if (art.saleMode === 'negotiation_only') {
      throw new Error('This work requires an accepted offer prior to acquisition.');
    }

    const orderId = `ord-${Date.now().toString(36)}`;
    const created = await db
      .insert(orders)
      .values({
        id: orderId,
        artworkId: art.id,
        buyerId: params.buyerUid,
        sellerId: art.artistId,
        offerId: params.offerId || null,
        amount: verifiedPrice,
        currency: art.currency,
        status: 'awaiting_payment', // Honest status: never pretends payment is completed
        shippingCity: params.shippingCity.trim(),
        collectorNote: params.collectorNote.trim(),
      })
      .returning();

    return created[0];
  } catch (error) {
    console.error('Database createPurchaseIntentInDb failed:', error);
    throw new Error(
      error instanceof Error ? error.message : 'Unable to register acquisition intent.',
      { cause: error }
    );
  }
}

export async function completePurchaseInDb(params: {
  orderId: string;
  artworkId: string;
  collectorId: string;
  amount: number;
  currency: string;
}) {
  try {
    const orderRows = await db
      .select()
      .from(orders)
      .where(eq(orders.id, params.orderId));
    if (orderRows.length === 0) {
      throw new Error('Order not found.');
    }
    const order = orderRows[0];

    // Verify the order belongs to the collector
    if (order.buyerId !== params.collectorId) {
      throw new Error('Forbidden: Only the order owner can complete this purchase.');
    }

    // Verify the artwork exists and is available
    const artRows = await db
      .select()
      .from(artworks)
      .where(eq(artworks.id, params.artworkId));
    if (artRows.length === 0) {
      throw new Error('Artwork not found.');
    }
    const art = artRows[0];

    if (art.availability !== 'available' && art.availability !== 'reserved') {
      throw new Error('This artwork is no longer available for purchase.');
    }

    // Mark order as completed
    const updatedOrder = await db
      .update(orders)
      .set({ status: 'completed' })
      .where(eq(orders.id, params.orderId))
      .returning();

    // Record the purchase
    const purchaseId = `purchase-${Date.now().toString(36)}`;
    const purchase = await db
      .insert(purchases)
      .values({
        id: purchaseId,
        artworkId: params.artworkId,
        collectorId: params.collectorId,
        orderId: params.orderId,
        purchasePrice: params.amount,
        currency: params.currency,
      })
      .returning();

    // Mark artwork as sold
    await db
      .update(artworks)
      .set({ availability: 'sold', updatedAt: new Date() })
      .where(eq(artworks.id, params.artworkId));

    return { order: updatedOrder[0], purchase: purchase[0] };
  } catch (error) {
    console.error('Database completePurchaseInDb failed:', error);
    if (error instanceof Error && error.message.startsWith('Forbidden:')) {
      throw error;
    }
    throw new Error(
      error instanceof Error ? error.message : 'Unable to complete purchase.',
      { cause: error }
    );
  }
}

export async function getPurchasesForCollector(collectorId: string) {
  try {
    const purchaseRows = await db
      .select()
      .from(purchases)
      .where(eq(purchases.collectorId, collectorId))
      .orderBy(desc(purchases.purchasedAt));

    if (purchaseRows.length === 0) {
      return { purchases: [], artworks: [] };
    }

    const artworkIds = purchaseRows.map((p) => p.artworkId);
    const artworksRows = await db
      .select()
      .from(artworks)
      .where(inArray(artworks.id, artworkIds));

    return {
      purchases: purchaseRows,
      artworks: artworksRows,
    };
  } catch (error) {
    console.error('Database getPurchasesForCollector failed:', error);
    throw new Error('Unable to load purchased artworks.', { cause: error });
  }
}

export async function getPurchasedArtworkIds(collectorId: string): Promise<string[]> {
  try {
    const purchaseRows = await db
      .select({ artworkId: purchases.artworkId })
      .from(purchases)
      .where(eq(purchases.collectorId, collectorId));
    return purchaseRows.map((p) => p.artworkId);
  } catch (error) {
    console.error('Database getPurchasedArtworkIds failed:', error);
    throw new Error('Unable to load purchased artwork IDs.', { cause: error });
  }
}

export async function checkArtworkPurchased(
  artworkId: string,
  collectorId: string
): Promise<boolean> {
  try {
    const result = await db
      .select()
      .from(purchases)
      .where(
        and(
          eq(purchases.artworkId, artworkId),
          eq(purchases.collectorId, collectorId)
        )
      );
    return result.length > 0;
  } catch (error) {
    console.error('Database checkArtworkPurchased failed:', error);
    return false;
  }
}
