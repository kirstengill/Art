ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS registration_date timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS is_demo boolean NOT NULL DEFAULT false;

UPDATE public.profiles
SET registration_date = created_at
WHERE registration_date IS NULL;

ALTER TABLE public.artworks
  ADD COLUMN IF NOT EXISTS is_demo boolean NOT NULL DEFAULT false;

ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS is_demo boolean NOT NULL DEFAULT false;

ALTER TABLE public.conversations
  ADD COLUMN IF NOT EXISTS is_demo boolean NOT NULL DEFAULT false;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_account_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.artworks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collection_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.artwork_offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Public can view active artist profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid()::text = id);
CREATE POLICY "Public can view active artist profiles"
  ON public.profiles FOR SELECT
  USING (role = 'artist' AND account_status = 'active' AND is_demo = false);
CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid()::text = id)
  WITH CHECK (auth.uid()::text = id);

REVOKE UPDATE ON public.profiles FROM PUBLIC, anon, authenticated;
GRANT UPDATE (
  full_name,
  handle,
  username,
  avatar_url,
  cover_url,
  bio,
  location,
  discipline,
  updated_at
) ON public.profiles TO authenticated;

DROP POLICY IF EXISTS "Artists manage only their own artworks" ON public.artworks;
CREATE POLICY "Artists manage only their own artworks"
  ON public.artworks FOR ALL TO authenticated
  USING (
    auth.uid()::text = artist_id
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()::text AND p.role = 'artist'
    )
  )
  WITH CHECK (
    auth.uid()::text = artist_id
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()::text AND p.role = 'artist'
    )
  );
REVOKE UPDATE ON public.artworks FROM PUBLIC, anon, authenticated;
REVOKE INSERT ON public.artworks FROM PUBLIC, anon, authenticated;
GRANT INSERT (
  id,
  artist_id,
  title,
  description,
  category,
  medium,
  dimensions,
  year,
  price,
  currency,
  availability,
  sale_mode,
  image_key,
  provenance,
  accession_number,
  edition_info
) ON public.artworks TO authenticated;
GRANT UPDATE (
  title,
  description,
  category,
  medium,
  dimensions,
  year,
  price,
  currency,
  availability,
  sale_mode,
  image_key,
  provenance,
  accession_number,
  edition_info,
  updated_at
) ON public.artworks TO authenticated;

DROP POLICY IF EXISTS "Users can create posts" ON public.posts;
DROP POLICY IF EXISTS "Authenticated users can create posts" ON public.posts;
CREATE POLICY "Artists can create posts"
  ON public.posts FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid()::text = author_id
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()::text AND p.role = 'artist'
    )
  );
REVOKE UPDATE ON public.posts FROM PUBLIC, anon, authenticated;
REVOKE INSERT ON public.posts FROM PUBLIC, anon, authenticated;
GRANT INSERT (id, author_id, artwork_id, title, body, image_key)
  ON public.posts TO authenticated;
GRANT UPDATE (artwork_id, title, body, image_key) ON public.posts TO authenticated;

CREATE OR REPLACE FUNCTION public.refresh_post_likes_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  target_post_id text := COALESCE(NEW.post_id, OLD.post_id);
BEGIN
  UPDATE public.posts
  SET likes_count = (
    SELECT count(*)::integer FROM public.likes WHERE post_id = target_post_id
  )
  WHERE id = target_post_id;
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.refresh_post_comments_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  target_post_id text := COALESCE(NEW.post_id, OLD.post_id);
BEGIN
  UPDATE public.posts
  SET comments_count = (
    SELECT count(*)::integer FROM public.comments WHERE post_id = target_post_id
  )
  WHERE id = target_post_id;
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS refresh_post_likes_count ON public.likes;
CREATE TRIGGER refresh_post_likes_count
  AFTER INSERT OR DELETE ON public.likes
  FOR EACH ROW EXECUTE FUNCTION public.refresh_post_likes_count();

DROP TRIGGER IF EXISTS refresh_post_comments_count ON public.comments;
CREATE TRIGGER refresh_post_comments_count
  AFTER INSERT OR DELETE ON public.comments
  FOR EACH ROW EXECUTE FUNCTION public.refresh_post_comments_count();

REVOKE ALL ON FUNCTION public.refresh_post_likes_count() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.refresh_post_comments_count() FROM PUBLIC, anon, authenticated;

DROP POLICY IF EXISTS "Only participants can view conversations" ON public.conversations;
DROP POLICY IF EXISTS "Only conversation participants can create inquiries" ON public.conversations;
DROP POLICY IF EXISTS "Conversation participants can update previews" ON public.conversations;
CREATE POLICY "Only participants can view conversations"
  ON public.conversations FOR SELECT TO authenticated
  USING (auth.uid()::text = collector_id OR auth.uid()::text = artist_id);
CREATE POLICY "Only conversation participants can create inquiries"
  ON public.conversations FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid()::text = collector_id
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()::text AND p.role IN ('collector', 'art_lover')
    )
  );
CREATE POLICY "Conversation participants can update previews"
  ON public.conversations FOR UPDATE TO authenticated
  USING (auth.uid()::text = collector_id OR auth.uid()::text = artist_id)
  WITH CHECK (auth.uid()::text = collector_id OR auth.uid()::text = artist_id);
REVOKE UPDATE ON public.conversations FROM PUBLIC, anon, authenticated;
GRANT UPDATE (last_message_preview, last_message_at) ON public.conversations TO authenticated;

DROP POLICY IF EXISTS "Only participants may create offers" ON public.artwork_offers;
DROP POLICY IF EXISTS "Only authorized participants may create offers" ON public.artwork_offers;
DROP POLICY IF EXISTS "Only authorized participants may respond to offers" ON public.artwork_offers;
CREATE POLICY "Only authorized participants may create offers"
  ON public.artwork_offers FOR INSERT TO authenticated
  WITH CHECK (
    sender_id = auth.uid()::text
    AND EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = public.artwork_offers.conversation_id
        AND c.artwork_id = public.artwork_offers.artwork_id
      AND (
        (
          public.artwork_offers.parent_offer_id IS NULL
          AND c.collector_id = auth.uid()::text
          AND c.artist_id = public.artwork_offers.recipient_id
        )
        OR EXISTS (
          SELECT 1
          FROM public.artwork_offers parent
          WHERE parent.id = public.artwork_offers.parent_offer_id
            AND parent.conversation_id = c.id
            AND parent.artwork_id = c.artwork_id
            AND parent.status = 'countered'
            AND parent.recipient_id = auth.uid()::text
            AND parent.sender_id = public.artwork_offers.recipient_id
        )
      )
    )
    AND status = 'pending'
  );
CREATE POLICY "Only authorized participants may respond to offers"
  ON public.artwork_offers FOR UPDATE TO authenticated
  USING (
    status = 'pending'
    AND (auth.uid()::text = sender_id OR auth.uid()::text = recipient_id)
  )
  WITH CHECK (
    (auth.uid()::text = sender_id AND status = 'withdrawn')
    OR (
      auth.uid()::text = recipient_id
      AND status IN ('accepted', 'rejected', 'countered')
    )
  );
REVOKE UPDATE ON public.artwork_offers FROM PUBLIC, anon, authenticated;
GRANT UPDATE (status, updated_at) ON public.artwork_offers TO authenticated;

DROP POLICY IF EXISTS "Users can create their own orders" ON public.orders;
CREATE POLICY "Collectors can create their own orders"
  ON public.orders FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid()::text = buyer_id
    AND status = 'awaiting_payment'
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()::text AND p.role = 'collector'
    )
    AND EXISTS (
      SELECT 1
      FROM public.artworks a
      WHERE a.id = public.orders.artwork_id
        AND a.artist_id = public.orders.seller_id
        AND a.availability <> 'sold'
        AND (
          (
            public.orders.offer_id IS NULL
            AND public.orders.amount = a.price
            AND public.orders.currency = a.currency
            AND a.sale_mode <> 'negotiation_only'
          )
          OR EXISTS (
            SELECT 1
            FROM public.artwork_offers o
            WHERE o.id = public.orders.offer_id
              AND o.artwork_id = a.id
              AND o.status = 'accepted'
              AND o.amount = public.orders.amount
              AND o.currency = public.orders.currency
              AND (
                (o.sender_id = auth.uid()::text AND o.recipient_id = a.artist_id)
                OR (o.recipient_id = auth.uid()::text AND o.sender_id = a.artist_id)
              )
          )
        )
    )
  );
REVOKE INSERT ON public.orders FROM PUBLIC, anon, authenticated;
GRANT INSERT (
  id,
  artwork_id,
  buyer_id,
  seller_id,
  offer_id,
  amount,
  currency,
  status,
  shipping_city,
  collector_note
) ON public.orders TO authenticated;
REVOKE UPDATE ON public.orders FROM PUBLIC, anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.purchases FROM PUBLIC, anon, authenticated;

DROP POLICY IF EXISTS "Authenticated users upload their own artwork images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users update their own artwork images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users delete their own artwork images" ON storage.objects;
DROP POLICY IF EXISTS "Artists upload their own artwork images" ON storage.objects;
DROP POLICY IF EXISTS "Artists update their own artwork images" ON storage.objects;
DROP POLICY IF EXISTS "Artists delete their own artwork images" ON storage.objects;
CREATE POLICY "Artists upload their own artwork images"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'artwork-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()::text AND p.role = 'artist'
    )
  );
CREATE POLICY "Artists update their own artwork images"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'artwork-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()::text AND p.role = 'artist'
    )
  )
  WITH CHECK (
    bucket_id = 'artwork-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()::text AND p.role = 'artist'
    )
  );
CREATE POLICY "Artists delete their own artwork images"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'artwork-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()::text AND p.role = 'artist'
    )
  );
