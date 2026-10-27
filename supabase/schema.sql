-- Art Universe reference PostgreSQL & Row-Level Security (RLS) schema for Supabase deployments
-- Mirrors the core relational tables used by Art Universe with strict participant & owner RLS.

CREATE TABLE IF NOT EXISTS public.profiles (
  id text PRIMARY KEY,
  email text NOT NULL,
  full_name text NOT NULL,
  handle text NOT NULL UNIQUE,
  username text NOT NULL UNIQUE,
  role text NOT NULL DEFAULT 'collector' CHECK (role IN ('admin', 'artist', 'collector', 'art_lover')),
  account_status text NOT NULL DEFAULT 'active' CHECK (account_status IN ('active', 'pending', 'suspended', 'deleted')),
  registration_date timestamptz NOT NULL DEFAULT now(),
  avatar_url text,
  cover_url text,
  bio text NOT NULL DEFAULT '',
  location text NOT NULL DEFAULT '',
  discipline text NOT NULL DEFAULT 'Contemporary Fine Art',
  verified boolean NOT NULL DEFAULT false,
  is_demo boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('admin', 'artist', 'collector', 'art_lover'));

CREATE TABLE IF NOT EXISTS public.users (
  id serial PRIMARY KEY,
  uid text NOT NULL,
  email text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS users_uid_unique
  ON public.users (uid);

CREATE TABLE IF NOT EXISTS public.user_account_details (
  user_id text PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  first_name text NOT NULL,
  last_name text NOT NULL,
  phone_number text NOT NULL,
  address text,
  city text,
  country text,
  postal_code text,
  date_of_birth date,
  registration_date timestamptz NOT NULL DEFAULT now(),
  location text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

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
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

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

CREATE TABLE IF NOT EXISTS public.comments (
  id text PRIMARY KEY,
  post_id text NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  author_id text NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.likes (
  id serial PRIMARY KEY,
  post_id text NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id text NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (post_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.follows (
  id serial PRIMARY KEY,
  follower_id text NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  following_id text NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (follower_id, following_id)
);

CREATE TABLE IF NOT EXISTS public.collections (
  id text PRIMARY KEY,
  owner_id text NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  is_public boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.collection_items (
  id serial PRIMARY KEY,
  collection_id text NOT NULL REFERENCES public.collections(id) ON DELETE CASCADE,
  artwork_id text NOT NULL REFERENCES public.artworks(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (collection_id, artwork_id)
);

CREATE TABLE IF NOT EXISTS public.conversations (
  id text PRIMARY KEY,
  artwork_id text NOT NULL REFERENCES public.artworks(id) ON DELETE CASCADE,
  collector_id text NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  artist_id text NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  last_message_preview text NOT NULL DEFAULT '',
  last_message_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.conversation_participants (
  id serial PRIMARY KEY,
  conversation_id text NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  profile_id text NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  unread_count integer NOT NULL DEFAULT 0,
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (conversation_id, profile_id)
);

CREATE TABLE IF NOT EXISTS public.messages (
  id text PRIMARY KEY,
  conversation_id text NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id text NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  body text NOT NULL,
  attachment_name text,
  message_type text NOT NULL DEFAULT 'text' CHECK (message_type IN ('text', 'offer_event', 'system')),
  created_at timestamptz NOT NULL DEFAULT now()
);

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

-- Purchases table: Tracks which collectors have purchased which artworks
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

-- Enable Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_account_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.artworks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collection_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.artwork_offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.users FROM PUBLIC, anon, authenticated;

-- Artwork images are public so artwork listings render for every visitor.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'artwork-images',
  'artwork-images',
  true,
  4718592,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

CREATE POLICY "Anyone can view artwork images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'artwork-images');

CREATE POLICY "Authenticated users upload their own artwork images"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'artwork-images' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- Artwork ownership policies
CREATE POLICY "Public artworks are viewable by everyone"
  ON public.artworks FOR SELECT USING (true);

CREATE POLICY "Artists manage only their own artworks"
  ON public.artworks FOR ALL
  USING (auth.uid()::text = artist_id)
  WITH CHECK (auth.uid()::text = artist_id);

-- Conversation & Message participant-only policies
CREATE POLICY "Only participants can view conversations"
  ON public.conversations FOR SELECT
  USING (auth.uid()::text = collector_id OR auth.uid()::text = artist_id);

CREATE POLICY "Only conversation participants may read messages"
  ON public.messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = messages.conversation_id
        AND (c.collector_id = auth.uid()::text OR c.artist_id = auth.uid()::text)
    )
  );

CREATE POLICY "Only conversation participants may send messages"
  ON public.messages FOR INSERT
  WITH CHECK (
    sender_id = auth.uid()::text AND
    EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = messages.conversation_id
        AND (c.collector_id = auth.uid()::text OR c.artist_id = auth.uid()::text)
    )
  );

-- Offer policies
CREATE POLICY "Only conversation participants may view offers"
  ON public.artwork_offers FOR SELECT
  USING (auth.uid()::text = sender_id OR auth.uid()::text = recipient_id);

CREATE POLICY "Only authorized participants may create offers"
  ON public.artwork_offers FOR INSERT
  WITH CHECK (sender_id = auth.uid()::text);

CREATE POLICY "Only authorized participants may respond to offers"
  ON public.artwork_offers FOR UPDATE
  USING (auth.uid()::text = sender_id OR auth.uid()::text = recipient_id);

-- Purchase policies: Collectors can view their own purchases
CREATE POLICY "Collectors can view their own purchases"
  ON public.purchases FOR SELECT
  USING (auth.uid()::text = collector_id);

-- Order policies: Users can view their own orders
CREATE POLICY "Users can view their own orders as buyer"
  ON public.orders FOR SELECT
  USING (auth.uid()::text = buyer_id);

CREATE POLICY "Users can view their own orders as seller"
  ON public.orders FOR SELECT
  USING (auth.uid()::text = seller_id);

-- Combined order view policy
CREATE POLICY "Users can view orders they are part of"
  ON public.orders FOR SELECT
  USING (auth.uid()::text = buyer_id OR auth.uid()::text = seller_id);
