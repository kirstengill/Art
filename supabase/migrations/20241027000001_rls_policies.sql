-- Migration: 20241027000001_rls_policies
-- Description: Row Level Security policies for all tables
-- Author: Artivora System
-- Created: 2024-10-27

-- ============================================
-- ENABLE ROW LEVEL SECURITY ON ALL TABLES
-- ============================================

-- Profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- User Account Details (private user info)
ALTER TABLE public.user_account_details ENABLE ROW LEVEL SECURITY;

-- Artworks
ALTER TABLE public.artworks ENABLE ROW LEVEL SECURITY;

-- Posts
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

-- Comments
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

-- Likes
ALTER TABLE public.likes ENABLE ROW LEVEL SECURITY;

-- Follows
ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;

-- Collections
ALTER TABLE public.collections ENABLE ROW LEVEL SECURITY;

-- Collection Items
ALTER TABLE public.collection_items ENABLE ROW LEVEL SECURITY;

-- Conversations
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

-- Conversation Participants
ALTER TABLE public.conversation_participants ENABLE ROW LEVEL SECURITY;

-- Messages
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Artwork Offers
ALTER TABLE public.artwork_offers ENABLE ROW LEVEL SECURITY;

-- Orders
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Purchases
ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;

-- Notifications
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- ============================================
-- PROFILES POLICIES
-- ============================================

-- Users can view their own profile
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid()::text = id);

-- Users can update their own profile
CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid()::text = id)
  WITH CHECK (auth.uid()::text = id);

-- Users can view public profile info (for artist pages, etc.)
CREATE POLICY "Public can view public profile info"
  ON public.profiles FOR SELECT
  USING (true);

-- ============================================
-- USER ACCOUNT DETAILS POLICIES
-- ============================================

-- Users can only access their own account details
CREATE POLICY "Users can access their own account details"
  ON public.user_account_details FOR ALL
  USING (auth.uid()::text = user_id)
  WITH CHECK (auth.uid()::text = user_id);

-- ============================================
-- ARTWORKS POLICIES
-- ============================================

-- Public can view all artworks
CREATE POLICY "Public artworks are viewable by everyone"
  ON public.artworks FOR SELECT USING (true);

-- Artists can manage their own artworks
CREATE POLICY "Artists manage only their own artworks"
  ON public.artworks FOR ALL
  USING (auth.uid()::text = artist_id)
  WITH CHECK (auth.uid()::text = artist_id);

-- ============================================
-- POSTS POLICIES
-- ============================================

-- Public can view posts
CREATE POLICY "Public can view posts"
  ON public.posts FOR SELECT USING (true);

-- Users can create posts (artists only via application logic)
CREATE POLICY "Authenticated users can create posts"
  ON public.posts FOR INSERT
  WITH CHECK (auth.uid()::text = author_id);

-- Users can update their own posts
CREATE POLICY "Users can update their own posts"
  ON public.posts FOR UPDATE
  USING (auth.uid()::text = author_id)
  WITH CHECK (auth.uid()::text = author_id);

-- Users can delete their own posts
CREATE POLICY "Users can delete their own posts"
  ON public.posts FOR DELETE
  USING (auth.uid()::text = author_id);

-- ============================================
-- COMMENTS POLICIES
-- ============================================

-- Public can view comments
CREATE POLICY "Public can view comments"
  ON public.comments FOR SELECT USING (true);

-- Users can create comments
CREATE POLICY "Authenticated users can create comments"
  ON public.comments FOR INSERT
  WITH CHECK (auth.uid()::text = author_id);

-- Users can update their own comments
CREATE POLICY "Users can update their own comments"
  ON public.comments FOR UPDATE
  USING (auth.uid()::text = author_id)
  WITH CHECK (auth.uid()::text = author_id);

-- Users can delete their own comments
CREATE POLICY "Users can delete their own comments"
  ON public.comments FOR DELETE
  USING (auth.uid()::text = author_id);

-- ============================================
-- LIKES POLICIES
-- ============================================

-- Users can view likes (for post like counts)
CREATE POLICY "Public can view likes"
  ON public.likes FOR SELECT USING (true);

-- Users can create likes
CREATE POLICY "Authenticated users can create likes"
  ON public.likes FOR INSERT
  WITH CHECK (auth.uid()::text = user_id);

-- Users can delete their own likes
CREATE POLICY "Users can delete their own likes"
  ON public.likes FOR DELETE
  USING (auth.uid()::text = user_id);

-- ============================================
-- FOLLOWS POLICIES
-- ============================================

-- Users can view follows they're part of
CREATE POLICY "Users can view their own follows"
  ON public.follows FOR SELECT
  USING (auth.uid()::text = follower_id OR auth.uid()::text = following_id);

-- Users can create follows
CREATE POLICY "Authenticated users can create follows"
  ON public.follows FOR INSERT
  WITH CHECK (auth.uid()::text = follower_id);

-- Users can delete their own follows
CREATE POLICY "Users can delete their own follows"
  ON public.follows FOR DELETE
  USING (auth.uid()::text = follower_id);

-- ============================================
-- COLLECTIONS POLICIES
-- ============================================

-- Users can view their own collections
CREATE POLICY "Users can view their own collections"
  ON public.collections FOR SELECT
  USING (auth.uid()::text = owner_id);

-- Users can create collections
CREATE POLICY "Authenticated users can create collections"
  ON public.collections FOR INSERT
  WITH CHECK (auth.uid()::text = owner_id);

-- Users can update their own collections
CREATE POLICY "Users can update their own collections"
  ON public.collections FOR UPDATE
  USING (auth.uid()::text = owner_id)
  WITH CHECK (auth.uid()::text = owner_id);

-- Users can delete their own collections
CREATE POLICY "Users can delete their own collections"
  ON public.collections FOR DELETE
  USING (auth.uid()::text = owner_id);

-- ============================================
-- COLLECTION ITEMS POLICIES
-- ============================================

-- Users can view collection items they own
CREATE POLICY "Users can view their own collection items"
  ON public.collection_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.collections c
      WHERE c.id = collection_id AND c.owner_id = auth.uid()::text
    )
  );

-- Users can add to their own collections
CREATE POLICY "Authenticated users can add to their own collections"
  ON public.collection_items FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.collections c
      WHERE c.id = collection_id AND c.owner_id = auth.uid()::text
    )
  );

-- Users can remove from their own collections
CREATE POLICY "Users can remove from their own collections"
  ON public.collection_items FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.collections c
      WHERE c.id = collection_id AND c.owner_id = auth.uid()::text
    )
  );

-- ============================================
-- CONVERSATIONS POLICIES
-- ============================================

-- Participants can view conversations
CREATE POLICY "Only participants can view conversations"
  ON public.conversations FOR SELECT
  USING (auth.uid()::text = collector_id OR auth.uid()::text = artist_id);

-- ============================================
-- CONVERSATION PARTICIPANTS POLICIES
-- ============================================

-- Users can view conversation participants they're part of
CREATE POLICY "Users can view their conversation participants"
  ON public.conversation_participants FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = conversation_id 
        AND (c.collector_id = auth.uid()::text OR c.artist_id = auth.uid()::text)
    )
  );

-- ============================================
-- MESSAGES POLICIES
-- ============================================

-- Participants can read messages
CREATE POLICY "Only conversation participants may read messages"
  ON public.messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = conversation_id
        AND (c.collector_id = auth.uid()::text OR c.artist_id = auth.uid()::text)
    )
  );

-- Participants can send messages
CREATE POLICY "Only conversation participants may send messages"
  ON public.messages FOR INSERT
  WITH CHECK (
    sender_id = auth.uid()::text AND
    EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = conversation_id
        AND (c.collector_id = auth.uid()::text OR c.artist_id = auth.uid()::text)
    )
  );

-- ============================================
-- ARTWORK OFFERS POLICIES
-- ============================================

-- Participants can view offers
CREATE POLICY "Only conversation participants may view offers"
  ON public.artwork_offers FOR SELECT
  USING (auth.uid()::text = sender_id OR auth.uid()::text = recipient_id);

-- Participants can create offers
CREATE POLICY "Only authorized participants may create offers"
  ON public.artwork_offers FOR INSERT
  WITH CHECK (sender_id = auth.uid()::text);

-- Participants can respond to offers
CREATE POLICY "Only authorized participants may respond to offers"
  ON public.artwork_offers FOR UPDATE
  USING (auth.uid()::text = sender_id OR auth.uid()::text = recipient_id);

-- ============================================
-- ORDERS POLICIES
-- ============================================

-- Users can view their own orders
CREATE POLICY "Users can view orders they are part of"
  ON public.orders FOR SELECT
  USING (auth.uid()::text = buyer_id OR auth.uid()::text = seller_id);

-- ============================================
-- PURCHASES POLICIES
-- ============================================

-- Collectors can view their own purchases
CREATE POLICY "Collectors can view their own purchases"
  ON public.purchases FOR SELECT
  USING (auth.uid()::text = collector_id);

-- ============================================
-- NOTIFICATIONS POLICIES
-- ============================================

-- Users can view their own notifications
CREATE POLICY "Users can view their own notifications"
  ON public.notifications FOR SELECT
  USING (auth.uid()::text = recipient_id);

-- Users can mark their own notifications as read
CREATE POLICY "Users can update their own notifications"
  ON public.notifications FOR UPDATE
  USING (auth.uid()::text = recipient_id)
  WITH CHECK (auth.uid()::text = recipient_id);

-- ============================================
-- STORAGE POLICIES
-- ============================================

-- Artwork images are public so artwork listings render for every visitor
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'artwork-images',
  'artwork-images',
  true,
  10485760,  -- 10 MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Anyone can view artwork images
CREATE POLICY "Anyone can view artwork images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'artwork-images');

-- Authenticated users upload their own artwork images
CREATE POLICY "Authenticated users upload their own artwork images"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'artwork-images' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- Authenticated users can update their own artwork images
CREATE POLICY "Authenticated users update their own artwork images"
  ON storage.objects FOR UPDATE TO authenticated
  WITH CHECK (
    bucket_id = 'artwork-images' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- Authenticated users can delete their own artwork images
CREATE POLICY "Authenticated users delete their own artwork images"
  ON storage.objects FOR DELETE TO authenticated
  WITH CHECK (
    bucket_id = 'artwork-images' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );
