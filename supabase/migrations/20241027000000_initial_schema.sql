-- Migration: 20241027000000_initial_schema
-- Description: Initial database schema for Artivora with user management, profiles, and all related tables
-- Author: Artivora System
-- Created: 2024-10-27

-- ============================================
-- PROFILES TABLE - User profile information
-- ============================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id text PRIMARY KEY,
  email text NOT NULL,
  full_name text NOT NULL,
  handle text NOT NULL UNIQUE,
  username text NOT NULL UNIQUE,
  phone_number text,
  role text NOT NULL DEFAULT 'collector' CHECK (role IN ('admin', 'artist', 'collector', 'art_lover')),
  avatar_url text,
  cover_url text,
  bio text NOT NULL DEFAULT '',
  location text NOT NULL DEFAULT '',
  discipline text NOT NULL DEFAULT 'Contemporary Fine Art',
  verified boolean NOT NULL DEFAULT false,
  account_status text NOT NULL DEFAULT 'active' CHECK (account_status IN ('active', 'pending', 'suspended', 'deleted')),
  is_demo boolean NOT NULL DEFAULT false,
  last_login_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_handle ON public.profiles(handle);
CREATE INDEX IF NOT EXISTS idx_profiles_username ON public.profiles(username);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_account_status ON public.profiles(account_status);
CREATE INDEX IF NOT EXISTS idx_profiles_created_at ON public.profiles(created_at);

-- Ensure handle and username are unique
ALTER TABLE public.profiles ADD CONSTRAINT profiles_handle_unique UNIQUE (handle);
ALTER TABLE public.profiles ADD CONSTRAINT profiles_username_unique UNIQUE (username);

-- Update constraint for role
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check 
  CHECK (role IN ('admin', 'artist', 'collector', 'art_lover'));

-- Update constraint for account_status
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_account_status_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_account_status_check 
  CHECK (account_status IN ('active', 'pending', 'suspended', 'deleted'));

-- ============================================
-- USER ACCOUNT DETAILS TABLE - Private user information
-- ============================================
CREATE TABLE IF NOT EXISTS public.user_account_details (
  user_id text PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  first_name text NOT NULL,
  last_name text NOT NULL,
  phone_number text NOT NULL,
  location text,
  address text,
  city text,
  country text,
  postal_code text,
  date_of_birth date,
  registration_date timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================
-- ARTWORKS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.artworks (
  id text PRIMARY KEY,
  artist_id text NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text NOT NULL,
  category text NOT NULL CHECK (category IN ('painting', 'photography', 'sculpture', 'drawing', 'digital_art')),
  medium text NOT NULL,
  dimensions text NOT NULL,
  year integer NOT NULL,
  price integer NOT NULL CHECK (price > 0),
  currency text NOT NULL DEFAULT 'USD',
  availability text NOT NULL DEFAULT 'available' CHECK (availability IN ('available', 'reserved', 'sold')),
  sale_mode text NOT NULL DEFAULT 'buy_now_and_negotiation' CHECK (sale_mode IN ('buy_now', 'negotiation_only', 'buy_now_and_negotiation')),
  image_key text NOT NULL,
  provenance text NOT NULL DEFAULT 'Direct from the artist studio',
  accession_number text NOT NULL,
  edition_info text NOT NULL DEFAULT 'Unique 1 of 1 original work',
  featured boolean NOT NULL DEFAULT false,
  likes_count integer NOT NULL DEFAULT 0,
  view_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_artworks_artist_id ON public.artworks(artist_id);
CREATE INDEX IF NOT EXISTS idx_artworks_category ON public.artworks(category);
CREATE INDEX IF NOT EXISTS idx_artworks_availability ON public.artworks(availability);
CREATE INDEX IF NOT EXISTS idx_artworks_created_at ON public.artworks(created_at);
CREATE INDEX IF NOT EXISTS idx_artworks_featured ON public.artworks(featured);

-- ============================================
-- POSTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.posts (
  id text PRIMARY KEY,
  author_id text NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  artwork_id text REFERENCES public.artworks(id) ON DELETE SET NULL,
  title text NOT NULL DEFAULT '',
  body text NOT NULL,
  image_key text,
  likes_count integer NOT NULL DEFAULT 0,
  comments_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_posts_author_id ON public.posts(author_id);
CREATE INDEX IF NOT EXISTS idx_posts_artwork_id ON public.posts(artwork_id);
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON public.posts(created_at);

-- ============================================
-- COMMENTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.comments (
  id text PRIMARY KEY,
  post_id text NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  author_id text NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_comments_post_id ON public.comments(post_id);
CREATE INDEX IF NOT EXISTS idx_comments_author_id ON public.comments(author_id);

-- ============================================
-- LIKES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.likes (
  id serial PRIMARY KEY,
  post_id text NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id text NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (post_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_likes_post_id ON public.likes(post_id);
CREATE INDEX IF NOT EXISTS idx_likes_user_id ON public.likes(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_likes_post_user_unique ON public.likes(post_id, user_id);

-- ============================================
-- FOLLOWS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.follows (
  id serial PRIMARY KEY,
  follower_id text NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  following_id text NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (follower_id, following_id)
);

CREATE INDEX IF NOT EXISTS idx_follows_follower_id ON public.follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_follows_following_id ON public.follows(following_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_follows_unique ON public.follows(follower_id, following_id);

-- ============================================
-- COLLECTIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.collections (
  id text PRIMARY KEY,
  owner_id text NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  is_public boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_collections_owner_id ON public.collections(owner_id);

-- ============================================
-- COLLECTION ITEMS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.collection_items (
  id serial PRIMARY KEY,
  collection_id text NOT NULL REFERENCES public.collections(id) ON DELETE CASCADE,
  artwork_id text NOT NULL REFERENCES public.artworks(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (collection_id, artwork_id)
);

CREATE INDEX IF NOT EXISTS idx_collection_items_collection_id ON public.collection_items(collection_id);
CREATE INDEX IF NOT EXISTS idx_collection_items_artwork_id ON public.collection_items(artwork_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_collection_items_unique ON public.collection_items(collection_id, artwork_id);

-- ============================================
-- CONVERSATIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.conversations (
  id text PRIMARY KEY,
  artwork_id text NOT NULL REFERENCES public.artworks(id) ON DELETE CASCADE,
  collector_id text NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  artist_id text NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  last_message_preview text NOT NULL DEFAULT '',
  last_message_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_conversations_artwork_id ON public.conversations(artwork_id);
CREATE INDEX IF NOT EXISTS idx_conversations_collector_id ON public.conversations(collector_id);
CREATE INDEX IF NOT EXISTS idx_conversations_artist_id ON public.conversations(artist_id);

-- ============================================
-- CONVERSATION PARTICIPANTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.conversation_participants (
  id serial PRIMARY KEY,
  conversation_id text NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  profile_id text NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  unread_count integer NOT NULL DEFAULT 0,
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (conversation_id, profile_id)
);

CREATE INDEX IF NOT EXISTS idx_conversation_participants_conversation_id ON public.conversation_participants(conversation_id);
CREATE INDEX IF NOT EXISTS idx_conversation_participants_profile_id ON public.conversation_participants(profile_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_conversation_participants_unique ON public.conversation_participants(conversation_id, profile_id);

-- ============================================
-- MESSAGES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.messages (
  id text PRIMARY KEY,
  conversation_id text NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id text NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  body text NOT NULL,
  attachment_name text,
  message_type text NOT NULL DEFAULT 'text' CHECK (message_type IN ('text', 'offer_event', 'system')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON public.messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON public.messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON public.messages(created_at);

-- ============================================
-- ARTWORK OFFERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.artwork_offers (
  id text PRIMARY KEY,
  conversation_id text NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  artwork_id text NOT NULL REFERENCES public.artworks(id) ON DELETE CASCADE,
  sender_id text NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  recipient_id text NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount integer NOT NULL CHECK (amount > 0),
  currency text NOT NULL DEFAULT 'USD',
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'countered', 'withdrawn', 'expired')),
  note text NOT NULL DEFAULT '',
  parent_offer_id text REFERENCES public.artwork_offers(id) ON DELETE SET NULL,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_artwork_offers_conversation_id ON public.artwork_offers(conversation_id);
CREATE INDEX IF NOT EXISTS idx_artwork_offers_artwork_id ON public.artwork_offers(artwork_id);
CREATE INDEX IF NOT EXISTS idx_artwork_offers_sender_id ON public.artwork_offers(sender_id);
CREATE INDEX IF NOT EXISTS idx_artwork_offers_recipient_id ON public.artwork_offers(recipient_id);

-- ============================================
-- ORDERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.orders (
  id text PRIMARY KEY,
  artwork_id text NOT NULL REFERENCES public.artworks(id) ON DELETE CASCADE,
  buyer_id text NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  seller_id text NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  offer_id text REFERENCES public.artwork_offers(id) ON DELETE SET NULL,
  amount integer NOT NULL CHECK (amount > 0),
  currency text NOT NULL DEFAULT 'USD',
  status text NOT NULL DEFAULT 'intent_created' CHECK (status IN ('intent_created', 'awaiting_payment', 'cancelled', 'completed')),
  shipping_city text NOT NULL DEFAULT '',
  collector_note text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_orders_artwork_id ON public.orders(artwork_id);
CREATE INDEX IF NOT EXISTS idx_orders_buyer_id ON public.orders(buyer_id);
CREATE INDEX IF NOT EXISTS idx_orders_seller_id ON public.orders(seller_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders(created_at);

-- ============================================
-- PURCHASES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.purchases (
  id text PRIMARY KEY,
  artwork_id text NOT NULL REFERENCES public.artworks(id) ON DELETE CASCADE,
  collector_id text NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  order_id text NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  purchase_price integer NOT NULL CHECK (purchase_price > 0),
  currency text NOT NULL DEFAULT 'USD',
  purchased_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (artwork_id, collector_id)
);

CREATE INDEX IF NOT EXISTS idx_purchases_artwork_id ON public.purchases(artwork_id);
CREATE INDEX IF NOT EXISTS idx_purchases_collector_id ON public.purchases(collector_id);
CREATE INDEX IF NOT EXISTS idx_purchases_order_id ON public.purchases(order_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_purchases_unique ON public.purchases(artwork_id, collector_id);

-- ============================================
-- NOTIFICATIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.notifications (
  id text PRIMARY KEY,
  recipient_id text NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type text NOT NULL,
  title text NOT NULL,
  body text NOT NULL,
  link_url text NOT NULL DEFAULT '/',
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_recipient_id ON public.notifications(recipient_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON public.notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at);
