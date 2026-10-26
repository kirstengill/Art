import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
import { auth, clearInMemoryToken, googleAuthProvider } from '../lib/firebase';
import { artverseApi } from '../services/artverseApi';
import {
  DEMO_ARTWORKS,
  DEMO_COMMENTS,
  DEMO_CONVERSATIONS,
  DEMO_MESSAGES,
  DEMO_OFFERS,
  DEMO_POSTS,
  DEMO_PROFILES,
} from '../data/demoSeed';
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

interface ArtVerseContextValue {
  profiles: Profile[];
  artworks: Artwork[];
  posts: CommunityPost[];
  comments: PostComment[];
  conversations: Conversation[];
  messages: ConversationMessage[];
  offers: ArtworkOffer[];
  orderIntents: OrderIntent[];
  savedArtworkIds: string[];
  followedArtistIds: string[];
  likedPostIds: string[];
  currentUser: Profile | null;
  authMode: 'authenticated' | 'demo' | 'guest';
  isLoadingCatalog: boolean;
  isLoadingThreads: boolean;
  catalogError: string | null;
  refreshCatalog: () => Promise<void>;
  refreshConversations: () => Promise<void>;
  signInWithGoogle: (preferredRole?: UserRole) => Promise<Profile>;
  signInDemoSession: (params: {
    email: string;
    fullName: string;
    role: UserRole;
    location?: string;
  }) => Profile;
  switchRole: (role: UserRole) => Promise<void>;
  logout: () => Promise<void>;
  toggleSaveArtwork: (artworkId: string) => Promise<void>;
  toggleFollowArtist: (artistId: string) => Promise<void>;
  publishOrUpdateArtwork: (input: ArtworkInput) => Promise<Artwork>;
  deleteArtwork: (artworkId: string) => Promise<void>;
  createCommunityPost: (payload: {
    title: string;
    body: string;
    artworkId?: string;
    imageKey?: string;
  }) => Promise<CommunityPost>;
  addComment: (postId: string, body: string) => Promise<void>;
  toggleLikePost: (postId: string) => Promise<void>;
  openOrCreateConversation: (artworkId: string) => Promise<Conversation>;
  sendMessage: (
    conversationId: string,
    body: string,
    attachmentName?: string,
    overrideSenderId?: string
  ) => Promise<void>;
  makeOffer: (params: {
    conversationId: string;
    amount: number;
    currency: string;
    note: string;
    overrideSenderId?: string;
  }) => Promise<ArtworkOffer>;
  respondToOffer: (params: {
    offerId: string;
    action: 'accept' | 'reject' | 'withdraw' | 'counter';
    counterAmount?: number;
    note?: string;
    overrideActorId?: string;
  }) => Promise<void>;
  createOrderIntent: (params: {
    artworkId: string;
    offerId?: string;
    shippingCity: string;
    collectorNote: string;
  }) => Promise<OrderIntent>;
  getProfileById: (id: string) => Profile | undefined;
  getArtworkById: (id: string) => Artwork | undefined;
}

const ArtVerseContext = createContext<ArtVerseContextValue | undefined>(undefined);

function uniqueDemoId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

function mergeById<T extends { id: string }>(
  primary: T[],
  fallback: T[] = []
): T[] {
  const seen = new Set<string>();
  const result: T[] = [];
  for (const item of [...primary, ...fallback]) {
    if (!item?.id || seen.has(item.id)) continue;
    seen.add(item.id);
    result.push(item);
  }
  return result;
}

function mergeChronologicalById<T extends { id: string; createdAt: string }>(
  latest: T[],
  fallback: T[] = []
): T[] {
  const byId = new Map<string, T>();
  for (const item of fallback) {
    if (item?.id) byId.set(item.id, item);
  }
  // Overwrite with latest server records so status updates win
  for (const item of latest) {
    if (item?.id) byId.set(item.id, item);
  }
  return Array.from(byId.values()).sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );
}

export const ArtVerseProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [profiles, setProfiles] = useState<Profile[]>(DEMO_PROFILES);
  const [artworks, setArtworks] = useState<Artwork[]>(DEMO_ARTWORKS);
  const [posts, setPosts] = useState<CommunityPost[]>(DEMO_POSTS);
  const [comments, setComments] = useState<PostComment[]>(DEMO_COMMENTS);
  const [conversations, setConversations] =
    useState<Conversation[]>(DEMO_CONVERSATIONS);
  const [messages, setMessages] = useState<ConversationMessage[]>(DEMO_MESSAGES);
  const [offers, setOffers] = useState<ArtworkOffer[]>(DEMO_OFFERS);
  const [orderIntents, setOrderIntents] = useState<OrderIntent[]>([]);
  const [savedArtworkIds, setSavedArtworkIds] = useState<string[]>([
    'art-vespers-ochre',
  ]);
  const [followedArtistIds, setFollowedArtistIds] = useState<string[]>([
    'artist-clara-vance',
  ]);
  const [likedPostIds, setLikedPostIds] = useState<string[]>([]);
  const [currentUser, setCurrentUser] = useState<Profile | null>(null);
  const [authMode, setAuthMode] = useState<'authenticated' | 'demo' | 'guest'>(
    'guest'
  );
  const [isLoadingCatalog, setIsLoadingCatalog] = useState<boolean>(true);
  const [isLoadingThreads, setIsLoadingThreads] = useState<boolean>(true);
  const [catalogError, setCatalogError] = useState<string | null>(null);

  const loadCatalog = useCallback(async () => {
    const startedAt = Date.now();
    setIsLoadingCatalog(true);
    setCatalogError(null);
    try {
      const data = await artverseApi.fetchCatalog();
      if (data.profiles.length > 0) {
        setProfiles(mergeById(data.profiles, DEMO_PROFILES));
      }
      if (data.artworks.length > 0) {
        setArtworks(mergeById(data.artworks, DEMO_ARTWORKS));
      }
      if (data.posts.length > 0) {
        setPosts(mergeById(data.posts, DEMO_POSTS));
      }
      if (data.comments.length > 0) {
        setComments(mergeChronologicalById(data.comments, DEMO_COMMENTS));
      }
      if (auth.currentUser) {
        setSavedArtworkIds(Array.from(new Set(data.savedArtworkIds)));
        setFollowedArtistIds(Array.from(new Set(data.followedArtistIds)));
        setLikedPostIds(Array.from(new Set(data.likedPostIds)));
      }
    } catch (err) {
      console.warn('Using local curated catalog fallback:', err);
    } finally {
      const elapsed = Date.now() - startedAt;
      if (elapsed < 280) {
        await new Promise((resolve) => setTimeout(resolve, 280 - elapsed));
      }
      setIsLoadingCatalog(false);
    }
  }, []);

  const refreshConversations = useCallback(async () => {
    const startedAt = Date.now();
    setIsLoadingThreads(true);
    try {
      if (auth.currentUser) {
        const convData = await artverseApi.fetchConversations();
        setConversations(mergeById(convData.conversations, DEMO_CONVERSATIONS));
        setMessages(mergeChronologicalById(convData.messages, DEMO_MESSAGES));
        setOffers(mergeChronologicalById(convData.offers, DEMO_OFFERS));
      } else {
        await artverseApi.fetchCatalog();
      }
    } catch (err) {
      console.warn('Conversation sync fallback:', err);
    } finally {
      const elapsed = Date.now() - startedAt;
      if (elapsed < 260) {
        await new Promise((resolve) => setTimeout(resolve, 260 - elapsed));
      }
      setIsLoadingThreads(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      await loadCatalog();
      if (active && !auth.currentUser) {
        setIsLoadingThreads(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [loadCatalog]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      if (!fbUser) {
        clearInMemoryToken();
        setAuthMode((prev) => (prev === 'demo' ? 'demo' : 'guest'));
        return;
      }

      setIsLoadingThreads(true);
      try {
        const { profile } = await artverseApi.syncProfile({
          fullName: fbUser.displayName || undefined,
        });
        setCurrentUser(profile);
        setAuthMode('authenticated');
        setProfiles((prev) => mergeById([profile], prev));

        const [cat, convData] = await Promise.all([
          artverseApi.fetchCatalog(),
          artverseApi.fetchConversations(),
        ]);
        setProfiles(mergeById([profile, ...cat.profiles], DEMO_PROFILES));
        setArtworks(mergeById(cat.artworks, DEMO_ARTWORKS));
        setPosts(mergeById(cat.posts, DEMO_POSTS));
        setComments(mergeChronologicalById(cat.comments, DEMO_COMMENTS));
        setSavedArtworkIds(Array.from(new Set(cat.savedArtworkIds)));
        setFollowedArtistIds(Array.from(new Set(cat.followedArtistIds)));
        setLikedPostIds(Array.from(new Set(cat.likedPostIds)));
        setConversations(mergeById(convData.conversations, DEMO_CONVERSATIONS));
        setMessages(mergeChronologicalById(convData.messages, DEMO_MESSAGES));
        setOffers(mergeChronologicalById(convData.offers, DEMO_OFFERS));
      } catch (err) {
        console.error('Failed to sync authenticated user:', err);
      } finally {
        setIsLoadingThreads(false);
      }
    });
    return () => unsubscribe();
  }, []);

  const signInWithGoogle = useCallback(async (preferredRole?: UserRole) => {
    const credential = await signInWithPopup(auth, googleAuthProvider);
    const { profile } = await artverseApi.syncProfile({
      fullName: credential.user.displayName || undefined,
      role: preferredRole,
    });
    setCurrentUser(profile);
    setAuthMode('authenticated');
    setProfiles((prev) => mergeById([profile], prev));
    return profile;
  }, []);

  const signInDemoSession = useCallback(
    (params: {
      email: string;
      fullName: string;
      role: UserRole;
      location?: string;
    }) => {
      // Match Clara Vance or Julian Mercer if user picks artist/collector demo presets, or build clean demo session
      const cleanName = params.fullName.trim() || 'Guest Collector';
      const handle = cleanName
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '')
        .slice(0, 20);
      const demoProfile: Profile = {
        id:
          params.role === 'artist'
            ? 'artist-clara-vance'
            : params.role === 'collector'
            ? 'collector-julian-mercer'
            : `demo-${handle || 'visitor'}`,
        email: params.email.trim(),
        fullName:
          params.role === 'artist' && cleanName === 'Clara Vance'
            ? 'Clara Vance'
            : cleanName,
        handle: handle || 'artverse_member',
        role: params.role,
        avatarUrl: params.role === 'artist' ? 'hero_gilded_horizon' : null,
        coverUrl: 'atelier_editorial_cover',
        bio:
          params.role === 'artist'
            ? 'Contemporary fine artist sharing studio works and collector editions.'
            : params.role === 'collector'
            ? 'Private collector exploring original works and studio acquisitions.'
            : 'Art enthusiast following contemporary exhibitions and studio notes.',
        location: params.location?.trim() || 'Paris, France',
        discipline:
          params.role === 'artist'
            ? 'Contemporary Fine Art'
            : params.role === 'collector'
            ? 'Private Collection'
            : 'Curatorial Appreciation',
        verified: params.role === 'artist',
        isDemo: true,
        createdAt: new Date().toISOString(),
      };
      setCurrentUser(demoProfile);
      setAuthMode('demo');
      setProfiles((prev) => {
        const filtered = prev.filter((p) => p.id !== demoProfile.id);
        return [demoProfile, ...filtered];
      });
      return demoProfile;
    },
    []
  );

  const switchRole = useCallback(
    async (role: UserRole) => {
      if (!currentUser) return;
      if (authMode === 'authenticated') {
        const { profile } = await artverseApi.syncProfile({ role });
        setCurrentUser(profile);
        setProfiles((prev) => mergeById([profile], prev));
      } else {
        const updated = { ...currentUser, role };
        setCurrentUser(updated);
        setProfiles((prev) => mergeById([updated], prev));
      }
    },
    [authMode, currentUser]
  );

  const logout = useCallback(async () => {
    if (auth.currentUser) {
      await signOut(auth);
    }
    clearInMemoryToken();
    setCurrentUser(null);
    setAuthMode('guest');
  }, []);

  const activeActor = useMemo<Profile>(() => {
    if (currentUser) return currentUser;
    return DEMO_PROFILES.find((p) => p.id === 'collector-julian-mercer')!;
  }, [currentUser]);

  const toggleSaveArtwork = useCallback(
    async (artworkId: string) => {
      const exists = savedArtworkIds.includes(artworkId);
      setSavedArtworkIds((prev) =>
        prev.includes(artworkId)
          ? prev.filter((id) => id !== artworkId)
          : Array.from(new Set([...prev, artworkId]))
      );
      setArtworks((prev) =>
        prev.map((art) =>
          art.id === artworkId
            ? { ...art, likesCount: Math.max(0, art.likesCount + (exists ? -1 : 1)) }
            : art
        )
      );
      if (authMode === 'authenticated') {
        try {
          await artverseApi.toggleBookmark(artworkId);
        } catch (err) {
          console.error('Bookmark sync error:', err);
        }
      }
    },
    [authMode, savedArtworkIds]
  );

  const toggleFollowArtist = useCallback(
    async (artistId: string) => {
      setFollowedArtistIds((prev) =>
        prev.includes(artistId)
          ? prev.filter((id) => id !== artistId)
          : Array.from(new Set([...prev, artistId]))
      );
      if (authMode === 'authenticated') {
        try {
          await artverseApi.toggleFollow(artistId);
        } catch (err) {
          console.error('Follow sync error:', err);
        }
      }
    },
    [authMode]
  );

  const publishOrUpdateArtwork = useCallback(
    async (input: ArtworkInput): Promise<Artwork> => {
      if (authMode === 'authenticated') {
        const { artwork } = await artverseApi.saveArtwork(input);
        setArtworks((prev) => mergeById([artwork], prev));
        return artwork;
      }

      const owner =
        currentUser?.role === 'artist'
          ? currentUser
          : DEMO_PROFILES.find((p) => p.id === 'artist-clara-vance')!;

      if (input.id) {
        let updatedItem: Artwork | null = null;
        setArtworks((prev) =>
          prev.map((item) => {
            if (item.id !== input.id) return item;
            updatedItem = {
              ...item,
              title: input.title.trim(),
              description: input.description.trim(),
              category: input.category,
              medium: input.medium.trim(),
              dimensions: input.dimensions.trim(),
              year: input.year,
              price: input.price,
              currency: input.currency,
              availability: input.availability,
              saleMode: input.saleMode,
              imageKey: input.imageKey,
              provenance: input.provenance?.trim() || item.provenance,
              editionInfo: input.editionInfo?.trim() || item.editionInfo,
            };
            return updatedItem;
          })
        );
        if (updatedItem) return updatedItem;
      }

      const demoArtwork: Artwork = {
        id: `art-demo-${Date.now().toString(36)}`,
        artistId: owner.id,
        title: input.title.trim(),
        description: input.description.trim(),
        category: input.category,
        medium: input.medium.trim(),
        dimensions: input.dimensions.trim(),
        year: input.year,
        price: input.price,
        currency: input.currency,
        availability: input.availability,
        saleMode: input.saleMode,
        imageKey: input.imageKey,
        provenance: input.provenance?.trim() || `Direct from ${owner.fullName} Studio`,
        accessionNumber: `AV-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 899)}`,
        editionInfo: input.editionInfo?.trim() || 'Unique 1 of 1 original work',
        featured: false,
        likesCount: 0,
        isDemo: true,
        createdAt: new Date().toISOString(),
      };
      setArtworks((prev) => [demoArtwork, ...prev]);
      return demoArtwork;
    },
    [authMode, currentUser]
  );

  const deleteArtwork = useCallback(
    async (artworkId: string) => {
      if (authMode === 'authenticated') {
        const target = artworks.find((a) => a.id === artworkId);
        if (target && !target.isDemo) {
          await artverseApi.deleteArtwork(artworkId);
        }
      }
      setArtworks((prev) => prev.filter((item) => item.id !== artworkId));
    },
    [artworks, authMode]
  );

  const createCommunityPost = useCallback(
    async (payload: {
      title: string;
      body: string;
      artworkId?: string;
      imageKey?: string;
    }): Promise<CommunityPost> => {
      if (authMode === 'authenticated') {
        const { post } = await artverseApi.createPost(payload);
        setPosts((prev) => mergeById([post], prev));
        return post;
      }

      const newPost: CommunityPost = {
        id: `post-demo-${Date.now().toString(36)}`,
        authorId: activeActor.id,
        artworkId: payload.artworkId || null,
        title: payload.title.trim(),
        body: payload.body.trim(),
        imageKey: payload.imageKey || null,
        likesCount: 0,
        commentsCount: 0,
        isDemo: true,
        createdAt: new Date().toISOString(),
      };
      setPosts((prev) => mergeById([newPost], prev));
      return newPost;
    },
    [activeActor.id, authMode]
  );

  const addComment = useCallback(
    async (postId: string, body: string) => {
      if (authMode === 'authenticated') {
        const { comment } = await artverseApi.addComment(postId, body);
        setComments((prev) => mergeChronologicalById([comment], prev));
        setPosts((prev) =>
          prev.map((p) =>
            p.id === postId ? { ...p, commentsCount: p.commentsCount + 1 } : p
          )
        );
        return;
      }

      const demoComment: PostComment = {
        id: `comment-demo-${Date.now().toString(36)}`,
        postId,
        authorId: activeActor.id,
        body: body.trim(),
        createdAt: new Date().toISOString(),
      };
      setComments((prev) => mergeChronologicalById([demoComment], prev));
      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId ? { ...p, commentsCount: p.commentsCount + 1 } : p
        )
      );
    },
    [activeActor.id, authMode]
  );

  const toggleLikePost = useCallback(
    async (postId: string) => {
      const already = likedPostIds.includes(postId);
      setLikedPostIds((prev) =>
        prev.includes(postId)
          ? prev.filter((id) => id !== postId)
          : Array.from(new Set([...prev, postId]))
      );
      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId
            ? { ...p, likesCount: Math.max(0, p.likesCount + (already ? -1 : 1)) }
            : p
        )
      );
      if (authMode === 'authenticated') {
        try {
          await artverseApi.togglePostLike(postId);
        } catch (err) {
          console.error('Like sync error:', err);
        }
      }
    },
    [authMode, likedPostIds]
  );

  const openOrCreateConversation = useCallback(
    async (artworkId: string): Promise<Conversation> => {
      const targetArt = artworks.find((a) => a.id === artworkId);
      if (!targetArt) {
        throw new Error('Artwork not found.');
      }

      if (authMode === 'authenticated' && !targetArt.isDemo) {
        const { conversation } = await artverseApi.openConversation(artworkId);
        setConversations((prev) => mergeById([conversation], prev));
        return conversation;
      }

      const collectorId =
        activeActor.id === targetArt.artistId
          ? 'collector-julian-mercer'
          : activeActor.id;

      const existing = conversations.find(
        (c) => c.artworkId === artworkId && c.collectorId === collectorId
      );
      if (existing) {
        return existing;
      }

      const created: Conversation = {
        id: uniqueDemoId('conv-demo'),
        artworkId,
        collectorId,
        artistId: targetArt.artistId,
        lastMessagePreview: `Opened private inquiry for ${targetArt.title}`,
        lastMessageAt: new Date().toISOString(),
        unreadCount: 0,
        isDemo: true,
        createdAt: new Date().toISOString(),
      };
      setConversations((prev) => mergeById([created], prev));
      return created;
    },
    [activeActor.id, artworks, authMode, conversations]
  );

  const sendMessage = useCallback(
    async (
      conversationId: string,
      body: string,
      attachmentName?: string,
      overrideSenderId?: string
    ) => {
      const targetConv = conversations.find((c) => c.id === conversationId);
      if (!targetConv) return;

      if (authMode === 'authenticated' && !targetConv.isDemo) {
        const { message } = await artverseApi.sendMessage(
          conversationId,
          body,
          attachmentName
        );
        setMessages((prev) => mergeChronologicalById([message], prev));
        setConversations((prev) =>
          prev.map((c) =>
            c.id === conversationId
              ? {
                  ...c,
                  lastMessagePreview: body.trim().slice(0, 140),
                  lastMessageAt: message.createdAt,
                }
              : c
          )
        );
        return;
      }

      const senderId = overrideSenderId || activeActor.id;
      const newMsg: ConversationMessage = {
        id: `msg-demo-${Date.now().toString(36)}`,
        conversationId,
        senderId,
        body: body.trim(),
        attachmentName: attachmentName || null,
        messageType: 'text',
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => mergeChronologicalById([newMsg], prev));
      setConversations((prev) =>
        prev.map((c) =>
          c.id === conversationId
            ? {
                ...c,
                lastMessagePreview: body.trim().slice(0, 140),
                lastMessageAt: newMsg.createdAt,
                unreadCount: 0,
              }
            : c
        )
      );
    },
    [activeActor.id, authMode, conversations]
  );

  const makeOffer = useCallback(
    async (params: {
      conversationId: string;
      amount: number;
      currency: string;
      note: string;
      overrideSenderId?: string;
    }): Promise<ArtworkOffer> => {
      const targetConv = conversations.find((c) => c.id === params.conversationId);
      if (!targetConv) {
        throw new Error('Conversation not found.');
      }

      if (authMode === 'authenticated' && !targetConv.isDemo) {
        const { offer } = await artverseApi.submitOffer(params.conversationId, {
          amount: params.amount,
          currency: params.currency,
          note: params.note,
        });
        const fresh = await artverseApi.fetchConversations();
        setOffers((prev) => mergeChronologicalById([offer, ...fresh.offers], prev));
        setMessages((prev) => mergeChronologicalById(fresh.messages, prev));
        setConversations((prev) => mergeById(fresh.conversations, prev));
        return offer;
      }

      const senderId = params.overrideSenderId || targetConv.collectorId;
      const recipientId =
        senderId === targetConv.collectorId
          ? targetConv.artistId
          : targetConv.collectorId;

      // Mark any older pending offers in this conversation as countered/superseded if needed
      const now = new Date().toISOString();
      const newOffer: ArtworkOffer = {
        id: uniqueDemoId('offer-demo'),
        conversationId: targetConv.id,
        artworkId: targetConv.artworkId,
        senderId,
        recipientId,
        amount: Math.round(params.amount),
        currency: params.currency || 'USD',
        status: 'pending',
        note: params.note.trim(),
        parentOfferId: null,
        expiresAt: new Date(Date.now() + 72 * 3600 * 1000).toISOString(),
        createdAt: now,
        updatedAt: now,
      };

      const eventBody = `Proposed an offer of $${newOffer.amount.toLocaleString()} ${newOffer.currency}${
        newOffer.note ? ` · "${newOffer.note}"` : ''
      }`;
      const eventMsg: ConversationMessage = {
        id: uniqueDemoId('msg-ev'),
        conversationId: targetConv.id,
        senderId,
        body: eventBody,
        attachmentName: null,
        messageType: 'offer_event',
        createdAt: now,
      };

      setOffers((prev) => mergeChronologicalById([newOffer], prev));
      setMessages((prev) => mergeChronologicalById([eventMsg], prev));
      setConversations((prev) =>
        prev.map((c) =>
          c.id === targetConv.id
            ? { ...c, lastMessagePreview: eventBody, lastMessageAt: now }
            : c
        )
      );
      return newOffer;
    },
    [authMode, conversations]
  );

  const respondToOffer = useCallback(
    async (params: {
      offerId: string;
      action: 'accept' | 'reject' | 'withdraw' | 'counter';
      counterAmount?: number;
      note?: string;
      overrideActorId?: string;
    }) => {
      const targetOffer = offers.find((o) => o.id === params.offerId);
      if (!targetOffer) return;

      const targetConv = conversations.find(
        (c) => c.id === targetOffer.conversationId
      );

      if (authMode === 'authenticated' && targetConv && !targetConv.isDemo) {
        const res = await artverseApi.respondToOffer(params.offerId, {
          action: params.action,
          counterAmount: params.counterAmount,
          note: params.note,
        });
        const fresh = await artverseApi.fetchConversations();
        const latestOffers = res.counterOffer
          ? [res.updatedOffer, res.counterOffer, ...fresh.offers]
          : [res.updatedOffer, ...fresh.offers];
        setOffers((prev) => mergeChronologicalById(latestOffers, prev));
        setMessages((prev) => mergeChronologicalById(fresh.messages, prev));
        setConversations((prev) => mergeById(fresh.conversations, prev));
        return;
      }

      const now = new Date().toISOString();
      const actorId =
        params.overrideActorId ||
        (params.action === 'withdraw'
          ? targetOffer.senderId
          : targetOffer.recipientId);

      if (params.action === 'withdraw') {
        setOffers((prev) =>
          prev.map((o) =>
            o.id === targetOffer.id
              ? { ...o, status: 'withdrawn', updatedAt: now }
              : o
          )
        );
        const wdBody = `Withdrew pending offer of $${targetOffer.amount.toLocaleString()} ${targetOffer.currency}.`;
        setMessages((prev) => [
          ...prev,
          {
            id: `msg-wd-${Date.now().toString(36)}`,
            conversationId: targetOffer.conversationId,
            senderId: actorId,
            body: wdBody,
            attachmentName: null,
            messageType: 'offer_event',
            createdAt: now,
          },
        ]);
        setConversations((prev) =>
          prev.map((c) =>
            c.id === targetOffer.conversationId
              ? { ...c, lastMessagePreview: wdBody, lastMessageAt: now }
              : c
          )
        );
        return;
      }

      if (params.action === 'accept' || params.action === 'reject') {
        const nextStatus = params.action === 'accept' ? 'accepted' : 'rejected';
        setOffers((prev) =>
          prev.map((o) =>
            o.id === targetOffer.id
              ? { ...o, status: nextStatus, updatedAt: now }
              : o
          )
        );

        if (nextStatus === 'accepted') {
          setArtworks((prev) =>
            prev.map((a) =>
              a.id === targetOffer.artworkId
                ? { ...a, availability: 'reserved' }
                : a
            )
          );
        }

        const rsBody =
          nextStatus === 'accepted'
            ? `Accepted offer of $${targetOffer.amount.toLocaleString()} ${targetOffer.currency}. Order remains unpaid pending formal collector invoice & escrow checkout.`
            : `Declined offer of $${targetOffer.amount.toLocaleString()} ${targetOffer.currency}${
                params.note?.trim() ? ` · "${params.note.trim()}"` : ''
              }`;

        setMessages((prev) => [
          ...prev,
          {
            id: `msg-rs-${Date.now().toString(36)}`,
            conversationId: targetOffer.conversationId,
            senderId: actorId,
            body: rsBody,
            attachmentName: null,
            messageType: 'offer_event',
            createdAt: now,
          },
        ]);
        setConversations((prev) =>
          prev.map((c) =>
            c.id === targetOffer.conversationId
              ? { ...c, lastMessagePreview: rsBody, lastMessageAt: now }
              : c
          )
        );
        return;
      }

      // Counteroffer
      const counterAmt = Math.round(params.counterAmount || targetOffer.amount);
      const counterOffer: ArtworkOffer = {
        id: `offer-ct-${Date.now().toString(36)}`,
        conversationId: targetOffer.conversationId,
        artworkId: targetOffer.artworkId,
        senderId: actorId,
        recipientId: targetOffer.senderId,
        amount: counterAmt,
        currency: targetOffer.currency,
        status: 'pending',
        note: params.note?.trim() || '',
        parentOfferId: targetOffer.id,
        expiresAt: new Date(Date.now() + 72 * 3600 * 1000).toISOString(),
        createdAt: now,
        updatedAt: now,
      };

      setOffers((prev) => [
        ...prev.map((o) =>
          o.id === targetOffer.id
            ? { ...o, status: 'countered' as const, updatedAt: now }
            : o
        ),
        counterOffer,
      ]);

      const ctBody = `Countered at $${counterAmt.toLocaleString()} ${counterOffer.currency}${
        counterOffer.note ? ` · "${counterOffer.note}"` : ''
      }`;
      setMessages((prev) => [
        ...prev,
        {
          id: `msg-ct-${Date.now().toString(36)}`,
          conversationId: targetOffer.conversationId,
          senderId: actorId,
          body: ctBody,
          attachmentName: null,
          messageType: 'offer_event',
          createdAt: now,
        },
      ]);
      setConversations((prev) =>
        prev.map((c) =>
          c.id === targetOffer.conversationId
            ? { ...c, lastMessagePreview: ctBody, lastMessageAt: now }
            : c
        )
      );
    },
    [authMode, conversations, offers]
  );

  const createOrderIntent = useCallback(
    async (params: {
      artworkId: string;
      offerId?: string;
      shippingCity: string;
      collectorNote: string;
    }): Promise<OrderIntent> => {
      const art = artworks.find((a) => a.id === params.artworkId);
      if (!art) throw new Error('Artwork not found.');

      if (authMode === 'authenticated' && !art.isDemo) {
        const { order } = await artverseApi.createOrderIntent(params);
        setOrderIntents((prev) => mergeById([order], prev));
        return order;
      }

      const matchedOffer = params.offerId
        ? offers.find((o) => o.id === params.offerId)
        : undefined;

      const intent: OrderIntent = {
        id: uniqueDemoId('ord-intent'),
        artworkId: art.id,
        buyerId: activeActor.id,
        sellerId: art.artistId,
        offerId: params.offerId || null,
        amount: matchedOffer ? matchedOffer.amount : art.price,
        currency: art.currency,
        status: 'awaiting_payment',
        shippingCity: params.shippingCity.trim(),
        collectorNote: params.collectorNote.trim(),
        createdAt: new Date().toISOString(),
      };
      setOrderIntents((prev) => mergeById([intent], prev));
      return intent;
    },
    [activeActor.id, artworks, authMode, offers]
  );

  const getProfileById = useCallback(
    (id: string) => profiles.find((p) => p.id === id),
    [profiles]
  );

  const getArtworkById = useCallback(
    (id: string) => artworks.find((a) => a.id === id),
    [artworks]
  );

  const value = useMemo<ArtVerseContextValue>(
    () => ({
      profiles,
      artworks,
      posts,
      comments,
      conversations,
      messages,
      offers,
      orderIntents,
      savedArtworkIds,
      followedArtistIds,
      likedPostIds,
      currentUser,
      authMode,
      isLoadingCatalog,
      isLoadingThreads,
      catalogError,
      refreshCatalog: loadCatalog,
      refreshConversations,
      signInWithGoogle,
      signInDemoSession,
      switchRole,
      logout,
      toggleSaveArtwork,
      toggleFollowArtist,
      publishOrUpdateArtwork,
      deleteArtwork,
      createCommunityPost,
      addComment,
      toggleLikePost,
      openOrCreateConversation,
      sendMessage,
      makeOffer,
      respondToOffer,
      createOrderIntent,
      getProfileById,
      getArtworkById,
    }),
    [
      profiles,
      artworks,
      posts,
      comments,
      conversations,
      messages,
      offers,
      orderIntents,
      savedArtworkIds,
      followedArtistIds,
      likedPostIds,
      currentUser,
      authMode,
      isLoadingCatalog,
      isLoadingThreads,
      catalogError,
      loadCatalog,
      refreshConversations,
      signInWithGoogle,
      signInDemoSession,
      switchRole,
      logout,
      toggleSaveArtwork,
      toggleFollowArtist,
      publishOrUpdateArtwork,
      deleteArtwork,
      createCommunityPost,
      addComment,
      toggleLikePost,
      openOrCreateConversation,
      sendMessage,
      makeOffer,
      respondToOffer,
      createOrderIntent,
      getProfileById,
      getArtworkById,
    ]
  );

  return (
    <ArtVerseContext.Provider value={value}>{children}</ArtVerseContext.Provider>
  );
};

export function useArtVerse() {
  const ctx = useContext(ArtVerseContext);
  if (!ctx) {
    throw new Error('useArtVerse must be used within ArtVerseProvider');
  }
  return ctx;
}
