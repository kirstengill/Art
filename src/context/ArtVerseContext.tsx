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
import {
  persistImageBeforeSave,
  publishArtworkWithSynchronizedProfile,
} from '../services/artworkPublishing';
import type {
  Artwork,
  ArtworkInput,
  ArtworkOffer,
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
  donations: Donation[];
  exhibitions: Exhibition[];
  savedArtworkIds: string[];
  followedArtistIds: string[];
  likedPostIds: string[];
  purchasedArtworkIds: string[];
  currentUser: Profile | null;
  authMode: 'authenticated' | 'guest';
  isAuthLoading: boolean;
  authError: string | null;
  isLoadingCatalog: boolean;
  isLoadingThreads: boolean;
  isLoadingPurchases: boolean;
  catalogError: string | null;
  threadError: string | null;
  purchaseError: string | null;
  donationError: string | null;
  exhibitionError: string | null;
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
  }) => Promise<{ emailConfirmationRequired: boolean; profile?: Profile }>;
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
  fetchDonations: () => Promise<void>;
  createDonation: (payload: DonationInput) => Promise<Donation>;
  fetchExhibitions: (status?: ExhibitionStatus) => Promise<void>;
  createExhibition: (payload: ExhibitionInput) => Promise<Exhibition>;
  updateExhibition: (exhibitionId: string, payload: Partial<ExhibitionInput>) => Promise<Exhibition>;
  deleteExhibition: (exhibitionId: string) => Promise<void>;
  createExhibitionSubmission: (payload: ExhibitionSubmissionInput) => Promise<ExhibitionSubmission>;
  fetchExhibitionSubmissions: (exhibitionId: string) => Promise<ExhibitionSubmission[]>;
  updateExhibitionSubmission: (submissionId: string, status: string, notes?: string) => Promise<ExhibitionSubmission>;
  fetchExhibitionArtworks: (exhibitionId: string) => Promise<Artwork[]>;
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

function isAccountRole(value: unknown): value is Profile['role'] {
  return value === 'admin' || value === 'artist' || value === 'collector' || value === 'art_lover';
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
  const [donations, setDonations] = useState<Donation[]>([]);
  const [exhibitions, setExhibitions] = useState<Exhibition[]>([]);
  const [savedArtworkIds, setSavedArtworkIds] = useState<string[]>([]);
  const [followedArtistIds, setFollowedArtistIds] = useState<string[]>([]);
  const [likedPostIds, setLikedPostIds] = useState<string[]>([]);
  const [purchasedArtworkIds, setPurchasedArtworkIds] = useState<string[]>([]);
  const [currentUser, setCurrentUser] = useState<Profile | null>(null);
  const [authMode, setAuthMode] = useState<'authenticated' | 'guest'>('guest');
  const [isAuthLoading, setIsAuthLoading] = useState(Boolean(supabase));
  const [authError, setAuthError] = useState<string | null>(null);
  const [isLoadingCatalog, setIsLoadingCatalog] = useState<boolean>(true);
  const [isLoadingThreads, setIsLoadingThreads] = useState<boolean>(true);
  const [isLoadingPurchases, setIsLoadingPurchases] = useState<boolean>(false);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [threadError, setThreadError] = useState<string | null>(null);
  const [purchaseError, setPurchaseError] = useState<string | null>(null);
  const [donationError, setDonationError] = useState<string | null>(null);
  const [exhibitionError, setExhibitionError] = useState<string | null>(null);
  const profileSyncTasks = useRef(new Map<string, Promise<Profile>>());
  const activeAuthUserId = useRef<string | null>(null);

  const syncSupabaseProfile = useCallback(
    (user: SupabaseUser) => {
      const taskKey = user.id;
      const activeTask = profileSyncTasks.current.get(taskKey);
      if (activeTask) return activeTask;

      setIsAuthLoading(true);
      setAuthError(null);
      const task = (async () => {
        try {
          const { profile } = await artverseApi.syncProfile({
            fullName:
              typeof user.user_metadata.full_name === 'string'
                ? user.user_metadata.full_name
                : typeof user.user_metadata.name === 'string'
                  ? user.user_metadata.name
                  : undefined,
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
          });
          if (profile.id !== user.id || !isAccountRole(profile.role)) {
            throw new Error('Unable to verify the role in your Supabase profile.');
          }
          if (activeAuthUserId.current !== user.id) return profile;
          setCurrentUser(profile);
          setAuthMode('authenticated');
          setProfiles((prev) => mergeById([profile], prev));
          return profile;
        } catch (error) {
          if (activeAuthUserId.current !== user.id) throw error;
          setCurrentUser(null);
          setAuthMode('guest');
          setAuthError(
            error instanceof Error ? error.message : 'Unable to verify your Supabase profile.'
          );
          throw error;
        } finally {
          if (activeAuthUserId.current === user.id) setIsAuthLoading(false);
          profileSyncTasks.current.delete(taskKey);
        }
      })();
      profileSyncTasks.current.set(taskKey, task);
      return task;
    },
    []
  );

  const loadCatalog = useCallback(async () => {
    if (authMode !== 'authenticated' || !currentUser || currentUser.role !== 'collector') {
      setProfiles([]);
      setArtworks([]);
      setPosts([]);
      setComments([]);
      setSavedArtworkIds([]);
      setFollowedArtistIds([]);
      setLikedPostIds([]);
      setIsLoadingCatalog(false);
      setCatalogError(null);
      return;
    }
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
        activeAuthUserId.current = null;
        setCurrentUser(null);
        setAuthMode('guest');
        setIsAuthLoading(false);
        setAuthError(null);
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
      activeAuthUserId.current = user.id;
      setCurrentUser(null);
      setAuthMode('guest');
      setIsAuthLoading(true);
      window.setTimeout(() => {
        if (!active) return;
        setIsLoadingThreads(true);
        void syncSupabaseProfile(user)
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
  }, [syncSupabaseProfile]);

  const signInWithEmail = useCallback(
    async (email: string, password: string) => {
      if (!supabase || !isSupabaseConfigured) {
        throw new Error('Supabase Auth is not configured. Check the Supabase URL and publishable key.');
      }
      activeAuthUserId.current = null;
      setCurrentUser(null);
      setAuthMode('guest');
      setIsAuthLoading(true);
      setAuthError(null);
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error || !data.user) {
          throw error || new Error('Supabase did not return an authenticated user.');
        }
        activeAuthUserId.current = data.user.id;
        await syncSupabaseProfile(data.user);
      } catch (error) {
        if (activeAuthUserId.current === null) setIsAuthLoading(false);
        throw error;
      }
    },
    [syncSupabaseProfile]
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
      activeAuthUserId.current = data.user.id;
      const profile = await syncSupabaseProfile(data.user);
      return { emailConfirmationRequired: false, profile };
    },
    [syncSupabaseProfile]
  );

  const logout = useCallback(async () => {
    if (supabase) {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    }
    activeAuthUserId.current = null;
    setCurrentUser(null);
    setAuthMode('guest');
    setIsAuthLoading(false);
    setAuthError(null);
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
      const artwork = await publishArtworkWithSynchronizedProfile(
        input.imageKey,
        async () => {
          const { profile } = await artverseApi.syncProfile({
            fullName: currentUser.fullName,
            role: 'artist',
            bio: currentUser.bio,
            location: currentUser.location,
          });
          if (profile.role !== 'artist') {
            throw new Error(
              'Your saved account is not registered as an artist. Please contact support before publishing.'
            );
          }
        },
        (dataUrl) => uploadArtworkImage(dataUrl, currentUser.id),
        async (imageKey) => {
          const { artwork: savedArtwork } = await artverseApi.saveArtwork({
            ...input,
            imageKey,
          });
          return savedArtwork;
        }
      );
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
      if (currentUser.role !== 'artist') {
        throw new Error('An artist account is required to publish community posts.');
      }
      const post = await persistImageBeforeSave(
        payload.imageKey,
        (dataUrl) => uploadArtworkImage(dataUrl, currentUser.id),
        async (imageKey) => {
          const result = await artverseApi.createPost({ ...payload, imageKey });
          return result.post;
        }
      );
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

  const fetchDonations = useCallback(async () => {
    if (authMode !== 'authenticated' || !currentUser) {
      setDonations([]);
      return;
    }
    setDonationError(null);
    try {
      const data = await artverseApi.fetchDonations();
      setDonations(data.donations || []);
    } catch (err) {
      setDonationError(err instanceof Error ? err.message : 'Unable to load donations.');
      setDonations([]);
    }
  }, [authMode, currentUser]);

  const createDonation = useCallback(
    async (payload: DonationInput): Promise<Donation> => {
      requireAuthenticatedUser(authMode, currentUser);
      setDonationError(null);
      try {
        const { donation } = await artverseApi.createDonation(payload);
        setDonations((prev) => [donation, ...prev]);
        return donation;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unable to create donation.';
        setDonationError(message);
        throw err;
      }
    },
    [authMode, currentUser]
  );

  const fetchExhibitions = useCallback(async (status?: ExhibitionStatus) => {
    setExhibitionError(null);
    try {
      const data = await artverseApi.fetchExhibitions(status);
      setExhibitions(data.exhibitions || []);
    } catch (err) {
      setExhibitionError(err instanceof Error ? err.message : 'Unable to load exhibitions.');
      setExhibitions([]);
    }
  }, []);

  const createExhibition = useCallback(
    async (payload: ExhibitionInput): Promise<Exhibition> => {
      requireAuthenticatedUser(authMode, currentUser);
      setExhibitionError(null);
      try {
        const { exhibition } = await artverseApi.createExhibition(payload);
        setExhibitions((prev) => [exhibition, ...prev]);
        return exhibition;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unable to create exhibition.';
        setExhibitionError(message);
        throw err;
      }
    },
    [authMode, currentUser]
  );

  const updateExhibition = useCallback(
    async (exhibitionId: string, payload: Partial<ExhibitionInput>): Promise<Exhibition> => {
      requireAuthenticatedUser(authMode, currentUser);
      setExhibitionError(null);
      try {
        const { exhibition } = await artverseApi.updateExhibition(exhibitionId, payload);
        setExhibitions((prev) =>
          prev.map((e) => (e.id === exhibitionId ? exhibition : e))
        );
        return exhibition;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unable to update exhibition.';
        setExhibitionError(message);
        throw err;
      }
    },
    [authMode, currentUser]
  );

  const deleteExhibition = useCallback(
    async (exhibitionId: string): Promise<void> => {
      requireAuthenticatedUser(authMode, currentUser);
      setExhibitionError(null);
      try {
        await artverseApi.deleteExhibition(exhibitionId);
        setExhibitions((prev) => prev.filter((e) => e.id !== exhibitionId));
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unable to delete exhibition.';
        setExhibitionError(message);
        throw err;
      }
    },
    [authMode, currentUser]
  );

  const createExhibitionSubmission = useCallback(
    async (payload: ExhibitionSubmissionInput): Promise<ExhibitionSubmission> => {
      requireAuthenticatedUser(authMode, currentUser);
      setExhibitionError(null);
      try {
        const { submission } = await artverseApi.createExhibitionSubmission(payload);
        return submission;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unable to submit to exhibition.';
        setExhibitionError(message);
        throw err;
      }
    },
    [authMode, currentUser]
  );

  const fetchExhibitionSubmissions = useCallback(
    async (exhibitionId: string): Promise<ExhibitionSubmission[]> => {
      requireAuthenticatedUser(authMode, currentUser);
      setExhibitionError(null);
      try {
        const data = await artverseApi.fetchExhibitionSubmissions(exhibitionId);
        return data.submissions || [];
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unable to load submissions.';
        setExhibitionError(message);
        throw err;
      }
    },
    [authMode, currentUser]
  );

  const fetchExhibitionArtworks = useCallback(
    async (exhibitionId: string): Promise<Artwork[]> => {
      requireAuthenticatedUser(authMode, currentUser);
      setExhibitionError(null);
      try {
        const data = await artverseApi.fetchExhibitionArtworks(exhibitionId);
        return (data.artworks || []) as Artwork[];
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unable to load exhibition artworks.';
        setExhibitionError(message);
        throw err;
      }
    },
    [authMode, currentUser]
  );

  const updateExhibitionSubmission = useCallback(
    async (
      submissionId: string,
      status: string,
      notes?: string
    ): Promise<ExhibitionSubmission> => {
      requireAuthenticatedUser(authMode, currentUser);
      setExhibitionError(null);
      try {
        const { submission } = await artverseApi.updateExhibitionSubmission(submissionId, status, notes);
        return submission;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unable to update submission.';
        setExhibitionError(message);
        throw err;
      }
    },
    [authMode, currentUser]
  );

  const getProfileById = useCallback(
    (id: string) => profiles.find((p) => p.id === id),
    [profiles]
  );

  const getArtworkById = useCallback(
    (id: string) => artworks.find((a) => a.id === id),
    [artworks]
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
      donations,
      exhibitions,
      savedArtworkIds,
      followedArtistIds,
      likedPostIds,
      purchasedArtworkIds,
      currentUser,
      authMode,
      isAuthLoading,
      authError,
      isLoadingCatalog,
      isLoadingThreads,
      isLoadingPurchases,
      catalogError,
      threadError,
      purchaseError,
      donationError,
      exhibitionError,
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
      fetchDonations,
      createDonation,
      fetchExhibitions,
      createExhibition,
      updateExhibition,
      deleteExhibition,
      createExhibitionSubmission,
      fetchExhibitionSubmissions,
      updateExhibitionSubmission,
      fetchExhibitionArtworks,
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
      isAuthLoading,
      authError,
      isLoadingCatalog,
      isLoadingThreads,
      isLoadingPurchases,
      catalogError,
      threadError,
      purchaseError,
      donationError,
      exhibitionError,
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
      fetchDonations,
      createDonation,
      fetchExhibitions,
      createExhibition,
      updateExhibition,
      deleteExhibition,
      createExhibitionSubmission,
      fetchExhibitionSubmissions,
      updateExhibitionSubmission,
      fetchExhibitionArtworks,
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
