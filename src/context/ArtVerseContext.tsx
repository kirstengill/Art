import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import {
  isSupabaseConfigured,
  supabase,
  uploadArtworkImage,
} from '../lib/supabase';
import { artverseApi } from '../services/artverseApi';
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
  Purchase,
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
  purchases: Purchase[];
  savedArtworkIds: string[];
  followedArtistIds: string[];
  likedPostIds: string[];
  purchasedArtworkIds: string[];
  currentUser: Profile | null;
  authMode: 'authenticated' | 'guest';
  isLoadingCatalog: boolean;
  isLoadingThreads: boolean;
  isLoadingPurchases: boolean;
  catalogError: string | null;
  threadError: string | null;
  purchaseError: string | null;
  refreshCatalog: () => Promise<void>;
  refreshConversations: () => Promise<void>;
  refreshPurchases: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (params: {
    email: string;
    password: string;
    firstName?: string;
    lastName?: string;
    phoneNumber?: string;
    fullName?: string;
    role: UserRole;
    location?: string;
  }) => Promise<{ emailConfirmationRequired: boolean }>;
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
    attachmentName?: string
  ) => Promise<void>;
  makeOffer: (params: {
    conversationId: string;
    amount: number;
    currency: string;
    note: string;
  }) => Promise<ArtworkOffer>;
  respondToOffer: (params: {
    offerId: string;
    action: 'accept' | 'reject' | 'withdraw' | 'counter';
    counterAmount?: number;
    note?: string;
  }) => Promise<void>;
  createOrderIntent: (params: {
    artworkId: string;
    offerId?: string;
    shippingCity: string;
    collectorNote: string;
  }) => Promise<OrderIntent>;
  completePurchase: (params: {
    orderId: string;
    artworkId: string;
    amount: number;
    currency: string;
  }) => Promise<{ order: OrderIntent; purchase: Purchase }>;
  getProfileById: (id: string) => Profile | undefined;
  getArtworkById: (id: string) => Artwork | undefined;
  getIsPurchased: (artworkId: string) => boolean;
}

const ArtVerseContext = createContext<ArtVerseContextValue | undefined>(undefined);

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
  latest: T[]
): T[] {
  const byId = new Map<string, T>();
  for (const item of latest) {
    if (item?.id) byId.set(item.id, item);
  }
  return Array.from(byId.values()).sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );
}

function requireAuthenticatedUser(
  authMode: 'authenticated' | 'guest',
  currentUser: Profile | null
): asserts currentUser is Profile {
  if (authMode !== 'authenticated' || !currentUser) {
    throw new Error('Sign in to use this feature.');
  }
}

function isUserRole(value: unknown): value is UserRole {
  return value === 'artist' || value === 'collector' || value === 'art_lover';
}

function profileFromSupabaseUser(
  user: SupabaseUser,
  preferredRole?: UserRole
): Profile {
  const metadata = user.user_metadata || {};
  const fullName =
    (typeof metadata.full_name === 'string' && metadata.full_name) ||
    (typeof metadata.name === 'string' && metadata.name) ||
    user.email?.split('@')[0] ||
    'ARTIVORA Member';
  const role = preferredRole || (isUserRole(metadata.role) ? metadata.role : 'collector');
  const handle =
    (typeof metadata.user_name === 'string' && metadata.user_name) ||
    fullName.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 20) ||
    'artivora_member';

  return {
    id: user.id,
    email: user.email || '',
    fullName,
    handle,
    role,
    avatarUrl:
      typeof metadata.avatar_url === 'string'
        ? metadata.avatar_url
        : typeof metadata.picture === 'string'
          ? metadata.picture
          : null,
    coverUrl: null,
    bio: typeof metadata.bio === 'string' ? metadata.bio : '',
    location: typeof metadata.location === 'string' ? metadata.location : '',
    discipline: role === 'artist' ? 'Contemporary Fine Art' : 'Private Collection',
    verified: false,
    isDemo: false,
    createdAt: user.created_at,
  };
}

export const ArtVerseProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [artworks, setArtworks] = useState<Artwork[]>([]);
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [comments, setComments] = useState<PostComment[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [offers, setOffers] = useState<ArtworkOffer[]>([]);
  const [orderIntents, setOrderIntents] = useState<OrderIntent[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [savedArtworkIds, setSavedArtworkIds] = useState<string[]>([]);
  const [followedArtistIds, setFollowedArtistIds] = useState<string[]>([]);
  const [likedPostIds, setLikedPostIds] = useState<string[]>([]);
  const [purchasedArtworkIds, setPurchasedArtworkIds] = useState<string[]>([]);
  const [currentUser, setCurrentUser] = useState<Profile | null>(null);
  const [authMode, setAuthMode] = useState<'authenticated' | 'guest'>('guest');
  const [isLoadingCatalog, setIsLoadingCatalog] = useState<boolean>(true);
  const [isLoadingThreads, setIsLoadingThreads] = useState<boolean>(true);
  const [isLoadingPurchases, setIsLoadingPurchases] = useState<boolean>(false);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [threadError, setThreadError] = useState<string | null>(null);
  const [purchaseError, setPurchaseError] = useState<string | null>(null);
  const profileSyncTasks = useRef(new Map<string, Promise<Profile>>());

  const syncSupabaseProfile = useCallback(
    (user: SupabaseUser, role?: UserRole) => {
      const taskKey = `${user.id}:${role || ''}`;
      const activeTask = profileSyncTasks.current.get(taskKey);
      if (activeTask) return activeTask;

      const task = artverseApi
        .syncProfile({
          fullName:
            typeof user.user_metadata.full_name === 'string'
              ? user.user_metadata.full_name
              : typeof user.user_metadata.name === 'string'
                ? user.user_metadata.name
                : undefined,
          role,
          firstName:
            typeof user.user_metadata.first_name === 'string'
              ? user.user_metadata.first_name
              : undefined,
          lastName:
            typeof user.user_metadata.last_name === 'string'
              ? user.user_metadata.last_name
              : undefined,
          phoneNumber:
            typeof user.user_metadata.phone_number === 'string'
              ? user.user_metadata.phone_number
              : undefined,
          location:
            typeof user.user_metadata.location === 'string'
              ? user.user_metadata.location
              : undefined,
        })
        .then(({ profile }) => {
          setCurrentUser(profile);
          setAuthMode('authenticated');
          setProfiles((prev) => mergeById([profile], prev));
          return profile;
        })
        .finally(() => {
          profileSyncTasks.current.delete(taskKey);
        });
      profileSyncTasks.current.set(taskKey, task);
      return task;
    },
    []
  );

  const activateSupabaseUser = useCallback((user: SupabaseUser, role?: UserRole) => {
    const profile = profileFromSupabaseUser(user, role);
    setCurrentUser(profile);
    setAuthMode('authenticated');
    setProfiles((prev) => mergeById([profile], prev));
    return profile;
  }, []);

  const loadCatalog = useCallback(async () => {
    const startedAt = Date.now();
    setIsLoadingCatalog(true);
    setCatalogError(null);
    try {
      const data = await artverseApi.fetchCatalog();
      setProfiles(data.profiles);
      setArtworks(data.artworks);
      setPosts(data.posts);
      setComments(mergeChronologicalById(data.comments));
      if (currentUser) {
        setSavedArtworkIds(Array.from(new Set(data.savedArtworkIds)));
        setFollowedArtistIds(Array.from(new Set(data.followedArtistIds)));
        setLikedPostIds(Array.from(new Set(data.likedPostIds)));
      } else {
        setSavedArtworkIds([]);
        setFollowedArtistIds([]);
        setLikedPostIds([]);
      }
    } catch (err) {
      setCatalogError(
        err instanceof Error ? err.message : 'Unable to load the artwork catalog.'
      );
      setProfiles([]);
      setArtworks([]);
      setPosts([]);
      setComments([]);
      setSavedArtworkIds([]);
      setFollowedArtistIds([]);
      setLikedPostIds([]);
    } finally {
      const elapsed = Date.now() - startedAt;
      if (elapsed < 280) {
        await new Promise((resolve) => setTimeout(resolve, 280 - elapsed));
      }
      setIsLoadingCatalog(false);
    }
  }, [currentUser]);

  const refreshPurchases = useCallback(async () => {
    if (authMode !== 'authenticated' || !currentUser || currentUser.role !== 'collector') {
      setPurchases([]);
      setPurchasedArtworkIds([]);
      return;
    }

    setIsLoadingPurchases(true);
    setPurchaseError(null);
    try {
      const data = await artverseApi.fetchPurchases();
      setPurchases(data.purchases || []);
      setPurchasedArtworkIds(data.purchases ? data.purchases.map((p: Purchase) => p.artworkId) : []);
    } catch (err) {
      setPurchaseError(
        err instanceof Error ? err.message : 'Unable to load your purchases.'
      );
      setPurchases([]);
      setPurchasedArtworkIds([]);
    } finally {
      setIsLoadingPurchases(false);
    }
  }, [authMode, currentUser]);

  const refreshConversations = useCallback(async () => {
    const startedAt = Date.now();
    setIsLoadingThreads(true);
    setThreadError(null);
    try {
      if (currentUser && authMode === 'authenticated') {
        const convData = await artverseApi.fetchConversations();
        setConversations(convData.conversations);
        setMessages(mergeChronologicalById(convData.messages));
        setOffers(mergeChronologicalById(convData.offers));
      } else {
        setConversations([]);
        setMessages([]);
        setOffers([]);
      }
    } catch (err) {
      setThreadError(
        err instanceof Error ? err.message : 'Unable to load conversations.'
      );
      setConversations([]);
      setMessages([]);
      setOffers([]);
    } finally {
      const elapsed = Date.now() - startedAt;
      if (elapsed < 260) {
        await new Promise((resolve) => setTimeout(resolve, 260 - elapsed));
      }
      setIsLoadingThreads(false);
    }
  }, [authMode, currentUser]);

  useEffect(() => {
    let active = true;
    (async () => {
      await loadCatalog();
      if (active && !currentUser) {
        setIsLoadingThreads(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [currentUser, loadCatalog]);

  useEffect(() => {
    if (!supabase) return;
    let active = true;
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return;
      if (!session?.user) {
        setCurrentUser(null);
        setAuthMode('guest');
        setSavedArtworkIds([]);
        setFollowedArtistIds([]);
        setLikedPostIds([]);
        setOrderIntents([]);
        setConversations([]);
        setMessages([]);
        setOffers([]);
        setThreadError(null);
        return;
      }

      const user = session.user;
      const role = isUserRole(user.user_metadata.role)
        ? user.user_metadata.role
        : undefined;
      activateSupabaseUser(user, role);

      window.setTimeout(() => {
        if (!active) return;
        setIsLoadingThreads(true);
        void syncSupabaseProfile(user, role)
          .then(async () => {
            if (!active) return;
            const [cat, convData] = await Promise.all([
              artverseApi.fetchCatalog(),
              artverseApi.fetchConversations(),
            ]);
            if (!active) return;
            setProfiles(cat.profiles);
            setArtworks(cat.artworks);
            setPosts(cat.posts);
            setComments(mergeChronologicalById(cat.comments));
            setSavedArtworkIds(Array.from(new Set(cat.savedArtworkIds)));
            setFollowedArtistIds(Array.from(new Set(cat.followedArtistIds)));
            setLikedPostIds(Array.from(new Set(cat.likedPostIds)));
            setConversations(convData.conversations);
            setMessages(mergeChronologicalById(convData.messages));
            setOffers(mergeChronologicalById(convData.offers));
          })
          .catch((err: unknown) => {
            console.error('Supabase user is signed in, but application profile sync failed:', err);
            setThreadError(
              err instanceof Error ? err.message : 'Unable to synchronize account data.'
            );
          })
          .finally(() => {
            if (active) setIsLoadingThreads(false);
          });
      }, 0);
    });
    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [activateSupabaseUser, syncSupabaseProfile]);

  const signInWithEmail = useCallback(
    async (email: string, password: string) => {
      if (!supabase || !isSupabaseConfigured) {
        throw new Error('Supabase Auth is not configured. Check the Supabase URL and publishable key.');
      }
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (error) throw error;
      if (!data.user) throw new Error('Supabase did not return an authenticated user.');
      const role = isUserRole(data.user.user_metadata.role)
        ? data.user.user_metadata.role
        : undefined;
      activateSupabaseUser(data.user, role);
    },
    [activateSupabaseUser]
  );

  const signUpWithEmail = useCallback(
    async (params: {
      email: string;
      password: string;
      firstName?: string;
      lastName?: string;
      phoneNumber?: string;
      fullName?: string;
      role: UserRole;
      location?: string;
    }) => {
      if (!supabase || !isSupabaseConfigured) {
        throw new Error('Supabase Auth is not configured. Check the Supabase URL and publishable key.');
      }
      const callbackUrl = new URL('/auth/callback', window.location.origin);
      callbackUrl.searchParams.set('next', params.role === 'artist' ? '/dashboard' : '/gallery');
      const { data, error } = await supabase.auth.signUp({
        email: params.email.trim(),
        password: params.password,
        options: {
          emailRedirectTo: callbackUrl.toString(),
          data: {
            full_name:
              params.fullName?.trim() ||
              [params.firstName, params.lastName].filter(Boolean).join(' '),
            role: params.role,
            location: params.location?.trim() || '',
            first_name: params.firstName?.trim() || '',
            last_name: params.lastName?.trim() || '',
            phone_number: params.phoneNumber?.trim() || '',
          },
        },
      });
      if (error) throw error;

      if (!data.session || !data.user) {
        return { emailConfirmationRequired: true };
      }
      activateSupabaseUser(data.user, params.role);
      return { emailConfirmationRequired: false };
    },
    [activateSupabaseUser]
  );

  const logout = useCallback(async () => {
    if (supabase) {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    }
    setCurrentUser(null);
    setAuthMode('guest');
    setSavedArtworkIds([]);
    setFollowedArtistIds([]);
    setLikedPostIds([]);
    setOrderIntents([]);
    setConversations([]);
    setMessages([]);
    setOffers([]);
  }, []);

  const toggleSaveArtwork = useCallback(
    async (artworkId: string) => {
      requireAuthenticatedUser(authMode, currentUser);
      const exists = savedArtworkIds.includes(artworkId);
      await artverseApi.toggleBookmark(artworkId);
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
    },
    [authMode, currentUser, savedArtworkIds]
  );

  const toggleFollowArtist = useCallback(
    async (artistId: string) => {
      requireAuthenticatedUser(authMode, currentUser);
      await artverseApi.toggleFollow(artistId);
      setFollowedArtistIds((prev) =>
        prev.includes(artistId)
            ? prev.filter((id) => id !== artistId)
            : Array.from(new Set([...prev, artistId]))
      );
    },
    [authMode, currentUser]
  );

  const publishOrUpdateArtwork = useCallback(
    async (input: ArtworkInput): Promise<Artwork> => {
      requireAuthenticatedUser(authMode, currentUser);
      if (currentUser.role !== 'artist') {
        throw new Error('An artist account is required to publish artwork.');
      }
      const isUploadedImage = input.imageKey.startsWith('data:image/');
      let imageKey = input.imageKey;
      if (isUploadedImage) {
        imageKey = await uploadArtworkImage(input.imageKey, currentUser.id);
      }

      const { artwork } = await artverseApi.saveArtwork({ ...input, imageKey });
      setArtworks((prev) => mergeById([artwork], prev));
      return artwork;
    },
    [authMode, currentUser]
  );

  const deleteArtwork = useCallback(
    async (artworkId: string) => {
      requireAuthenticatedUser(authMode, currentUser);
      await artverseApi.deleteArtwork(artworkId);
      setArtworks((prev) => prev.filter((item) => item.id !== artworkId));
    },
    [authMode, currentUser]
  );

  const createCommunityPost = useCallback(
    async (payload: {
      title: string;
      body: string;
      artworkId?: string;
      imageKey?: string;
    }): Promise<CommunityPost> => {
      requireAuthenticatedUser(authMode, currentUser);
      const { post } = await artverseApi.createPost(payload);
      setPosts((prev) => mergeById([post], prev));
      return post;
    },
    [authMode, currentUser]
  );

  const addComment = useCallback(
    async (postId: string, body: string) => {
      requireAuthenticatedUser(authMode, currentUser);
      const { comment } = await artverseApi.addComment(postId, body);
      setComments((prev) => mergeChronologicalById([comment, ...prev]));
      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId ? { ...p, commentsCount: p.commentsCount + 1 } : p
        )
      );
    },
    [authMode, currentUser]
  );

  const toggleLikePost = useCallback(
    async (postId: string) => {
      requireAuthenticatedUser(authMode, currentUser);
      const already = likedPostIds.includes(postId);
      await artverseApi.togglePostLike(postId);
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
    },
    [authMode, currentUser, likedPostIds]
  );

  const openOrCreateConversation = useCallback(
    async (artworkId: string): Promise<Conversation> => {
      requireAuthenticatedUser(authMode, currentUser);
      const targetArt = artworks.find((a) => a.id === artworkId);
      if (!targetArt) {
        throw new Error('Artwork not found.');
      }

      const { conversation } = await artverseApi.openConversation(artworkId);
      setConversations((prev) => mergeById([conversation], prev));
      return conversation;
    },
    [artworks, authMode, currentUser]
  );

  const sendMessage = useCallback(
    async (
      conversationId: string,
      body: string,
      attachmentName?: string
    ) => {
      requireAuthenticatedUser(authMode, currentUser);
      const targetConv = conversations.find((c) => c.id === conversationId);
      if (!targetConv) {
      throw new Error('Conversation not found.');
      }
      const { message } = await artverseApi.sendMessage(
      conversationId,
      body,
      attachmentName
      );
      setMessages((prev) => mergeChronologicalById([message, ...prev]));
      setConversations((prev) =>
      prev.map((c) =>
        c.id === conversationId
          ? {
              ...c,
              lastMessagePreview: body.trim().slice(0, 140),
              lastMessageAt: message.createdAt,
              unreadCount: 0,
            }
          : c
        )
      );
    },
    [authMode, conversations, currentUser]
  );

  const makeOffer = useCallback(
    async (params: {
      conversationId: string;
      amount: number;
      currency: string;
      note: string;
    }): Promise<ArtworkOffer> => {
      requireAuthenticatedUser(authMode, currentUser);
      const targetConv = conversations.find((c) => c.id === params.conversationId);
      if (!targetConv) {
        throw new Error('Conversation not found.');
      }

      const { offer } = await artverseApi.submitOffer(params.conversationId, {
        amount: params.amount,
        currency: params.currency,
        note: params.note,
      });
      const fresh = await artverseApi.fetchConversations();
      setOffers((prev) => mergeChronologicalById([offer, ...fresh.offers, ...prev]));
      setMessages((prev) => mergeChronologicalById([...fresh.messages, ...prev]));
      setConversations((prev) => mergeById(fresh.conversations, prev));
      return offer;
    },
    [authMode, conversations, currentUser]
  );

  const respondToOffer = useCallback(
    async (params: {
      offerId: string;
      action: 'accept' | 'reject' | 'withdraw' | 'counter';
      counterAmount?: number;
      note?: string;
    }) => {
      requireAuthenticatedUser(authMode, currentUser);
      const targetOffer = offers.find((o) => o.id === params.offerId);
      if (!targetOffer) {
        throw new Error('Offer not found.');
      }

      const res = await artverseApi.respondToOffer(params.offerId, {
        action: params.action,
        counterAmount: params.counterAmount,
        note: params.note,
      });
      const fresh = await artverseApi.fetchConversations();
      const latestOffers = res.counterOffer
        ? [res.updatedOffer, res.counterOffer, ...fresh.offers]
        : [res.updatedOffer, ...fresh.offers];
      setOffers((prev) => mergeChronologicalById([...latestOffers, ...prev]));
      setMessages((prev) => mergeChronologicalById([...fresh.messages, ...prev]));
      setConversations((prev) => mergeById(fresh.conversations, prev));
    },
    [authMode, currentUser, offers]
  );

  const createOrderIntent = useCallback(
    async (params: {
      artworkId: string;
      offerId?: string;
      shippingCity: string;
      collectorNote: string;
    }): Promise<OrderIntent> => {
      requireAuthenticatedUser(authMode, currentUser);
      const art = artworks.find((a) => a.id === params.artworkId);
      if (!art) throw new Error('Artwork not found.');

      const { order } = await artverseApi.createOrderIntent(params);
      setOrderIntents((prev) => mergeById([order], prev));
      return order;
    },
    [artworks, authMode, currentUser]
  );

  const getProfileById = useCallback(
    (id: string) => profiles.find((p) => p.id === id),
    [profiles]
  );

  const getArtworkById = useCallback(
    (id: string) => artworks.find((a) => a.id === id),
    [artworks]
  );

  const completePurchase = useCallback(
    async (params: {
      orderId: string;
      artworkId: string;
      amount: number;
      currency: string;
    }): Promise<{ order: OrderIntent; purchase: Purchase }> => {
      requireAuthenticatedUser(authMode, currentUser);
      if (currentUser?.role !== 'collector') {
        throw new Error('Only collectors can complete purchases.');
      }
      const result = await artverseApi.completePurchase(params);
      await refreshPurchases();
      await loadCatalog();
      return result;
    },
    [authMode, currentUser, refreshPurchases, loadCatalog]
  );

  const getIsPurchased = useCallback(
    (artworkId: string): boolean => {
      return purchasedArtworkIds.includes(artworkId);
    },
    [purchasedArtworkIds]
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
      purchases,
      savedArtworkIds,
      followedArtistIds,
      likedPostIds,
      purchasedArtworkIds,
      currentUser,
      authMode,
      isLoadingCatalog,
      isLoadingThreads,
      isLoadingPurchases,
      catalogError,
      threadError,
      purchaseError,
      refreshCatalog: loadCatalog,
      refreshConversations,
      refreshPurchases,
      signInWithEmail,
      signUpWithEmail,
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
      completePurchase,
      getProfileById,
      getArtworkById,
      getIsPurchased,
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
      purchases,
      savedArtworkIds,
      followedArtistIds,
      likedPostIds,
      purchasedArtworkIds,
      currentUser,
      authMode,
      isLoadingCatalog,
      isLoadingThreads,
      isLoadingPurchases,
      catalogError,
      threadError,
      purchaseError,
      loadCatalog,
      refreshConversations,
      refreshPurchases,
      signInWithEmail,
      signUpWithEmail,
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
      completePurchase,
      getProfileById,
      getArtworkById,
      getIsPurchased,
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
