ALTER TABLE public.purchase_requests
  ADD COLUMN IF NOT EXISTS collector_id text REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS admin_decided_by text REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS admin_decided_at timestamptz;

ALTER TABLE public.purchase_requests
  DROP CONSTRAINT IF EXISTS purchase_requests_status_check;
ALTER TABLE public.purchase_requests
  ADD CONSTRAINT purchase_requests_status_check
  CHECK (status IN ('pending', 'approved', 'rejected', 'confirmed', 'paid', 'delivered', 'completed', 'cancelled'));

CREATE INDEX IF NOT EXISTS idx_purchase_requests_collector_created
  ON public.purchase_requests (collector_id, created_at DESC);

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS purchase_request_id text UNIQUE
    REFERENCES public.purchase_requests(id) ON DELETE SET NULL;

ALTER TABLE public.orders
  DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE public.orders
  ADD CONSTRAINT orders_status_check
  CHECK (status IN ('intent_created', 'awaiting_payment', 'paid', 'delivered', 'cancelled', 'completed'));

ALTER TABLE public.purchases
  ADD COLUMN IF NOT EXISTS purchase_request_id text REFERENCES public.purchase_requests(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS payment_status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS delivery_status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS payment_confirmed_by text REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS payment_confirmed_at timestamptz,
  ADD COLUMN IF NOT EXISTS delivery_confirmed_by text REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS delivery_confirmed_at timestamptz;

ALTER TABLE public.purchases
  DROP CONSTRAINT IF EXISTS purchases_payment_status_check,
  DROP CONSTRAINT IF EXISTS purchases_delivery_status_check;
ALTER TABLE public.purchases
  ADD CONSTRAINT purchases_payment_status_check CHECK (payment_status IN ('pending', 'confirmed')),
  ADD CONSTRAINT purchases_delivery_status_check CHECK (delivery_status IN ('pending', 'confirmed'));

REVOKE UPDATE ON public.notifications FROM PUBLIC, anon, authenticated;
GRANT UPDATE (is_read) ON public.notifications TO authenticated;

CREATE UNIQUE INDEX IF NOT EXISTS idx_purchases_unique_purchase_request
  ON public.purchases (purchase_request_id)
  WHERE purchase_request_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_purchases_unique_approved_artwork
  ON public.purchases (artwork_id)
  WHERE purchase_request_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_orders_purchase_request_id
  ON public.orders (purchase_request_id)
  WHERE purchase_request_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.prevent_deleting_purchased_artwork()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.purchases WHERE artwork_id = OLD.id) THEN
    RAISE EXCEPTION 'This artwork has an approved purchase and cannot be permanently deleted.'
      USING ERRCODE = '23503';
  END IF;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS prevent_deleting_purchased_artwork ON public.artworks;
CREATE TRIGGER prevent_deleting_purchased_artwork
  BEFORE DELETE ON public.artworks
  FOR EACH ROW EXECUTE FUNCTION public.prevent_deleting_purchased_artwork();

CREATE OR REPLACE FUNCTION public.submit_purchase_request(
  p_request_id text,
  p_artwork_id text,
  p_buyer_name text,
  p_buyer_phone text,
  p_buyer_email text,
  p_delivery_location text,
  p_delivery_address text,
  p_instructions text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_collector_id text := auth.uid()::text;
  v_profile public.profiles%ROWTYPE;
  v_artwork public.artworks%ROWTYPE;
  v_artist public.profiles%ROWTYPE;
  v_request public.purchase_requests%ROWTYPE;
BEGIN
  IF v_collector_id IS NULL THEN
    RAISE EXCEPTION 'An authenticated collector account is required.' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_profile
  FROM public.profiles
  WHERE id = v_collector_id;
  IF NOT FOUND OR v_profile.role <> 'collector'
     OR v_profile.account_status <> 'active'
     OR v_profile.collector_approved_at IS NULL THEN
    RAISE EXCEPTION 'An approved collector account is required.' USING ERRCODE = '42501';
  END IF;

  IF p_request_id IS NULL
     OR p_request_id !~* '^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$'
     OR length(trim(COALESCE(p_buyer_name, ''))) < 2
     OR length(trim(COALESCE(p_buyer_phone, ''))) < 7
     OR trim(COALESCE(p_buyer_phone, '')) !~ '^[+()0-9.\-\s]+$'
     OR length(regexp_replace(COALESCE(p_buyer_phone, ''), '[^0-9]', '', 'g')) < 7
     OR (
       trim(COALESCE(p_buyer_email, '')) <> ''
       AND trim(p_buyer_email) !~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
     )
     OR length(trim(COALESCE(p_delivery_location, ''))) < 1
     OR length(trim(COALESCE(p_delivery_address, ''))) < 5
     OR length(COALESCE(p_buyer_name, '')) > 120
     OR length(COALESCE(p_buyer_phone, '')) > 40
     OR length(COALESCE(p_buyer_email, '')) > 254
     OR length(COALESCE(p_delivery_location, '')) > 160
     OR length(COALESCE(p_delivery_address, '')) > 500
     OR length(COALESCE(p_instructions, '')) > 2000 THEN
    RAISE EXCEPTION 'Purchase request details are invalid.' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_request
  FROM public.purchase_requests
  WHERE request_id = p_request_id;
  IF FOUND THEN
    IF v_request.collector_id = v_collector_id AND v_request.artwork_id = p_artwork_id THEN
      RETURN jsonb_build_object(
        'id', v_request.id,
        'status', v_request.status,
        'amount', v_request.amount,
        'currency', v_request.currency,
        'created_at', v_request.created_at
      );
    END IF;
    RAISE EXCEPTION 'This request reference has already been used.' USING ERRCODE = '23505';
  END IF;

  SELECT * INTO v_artwork
  FROM public.artworks
  WHERE id = p_artwork_id
  FOR UPDATE;
  IF NOT FOUND OR v_artwork.is_demo
     OR v_artwork.availability <> 'available'
     OR v_artwork.sale_mode NOT IN ('buy_now', 'buy_now_and_negotiation') THEN
    RAISE EXCEPTION 'This artwork is not currently available for direct purchase.' USING ERRCODE = 'P0001';
  END IF;

  SELECT * INTO v_artist
  FROM public.profiles
  WHERE id = v_artwork.artist_id;
  IF NOT FOUND OR v_artist.role <> 'artist'
     OR v_artist.account_status <> 'active' OR v_artist.is_demo THEN
    RAISE EXCEPTION 'This artwork is not available for purchase.' USING ERRCODE = 'P0001';
  END IF;

  INSERT INTO public.purchase_requests (
    id, request_id, artwork_id, artist_id, collector_id,
    buyer_name, buyer_phone, buyer_email, delivery_location, delivery_address, instructions,
    artwork_title, artwork_image, artist_name, artist_handle, amount, currency, status
  ) VALUES (
    'pr-' || gen_random_uuid()::text, p_request_id, v_artwork.id, v_artist.id, v_collector_id,
    trim(p_buyer_name), trim(p_buyer_phone), trim(COALESCE(p_buyer_email, '')),
    trim(p_delivery_location), trim(p_delivery_address), trim(COALESCE(p_instructions, '')),
    v_artwork.title, v_artwork.image_key, v_artist.full_name, v_artist.handle,
    v_artwork.price, v_artwork.currency, 'pending'
  )
  ON CONFLICT (request_id) DO NOTHING
  RETURNING * INTO v_request;

  IF NOT FOUND THEN
    SELECT * INTO v_request
    FROM public.purchase_requests
    WHERE request_id = p_request_id;
    IF v_request.collector_id = v_collector_id AND v_request.artwork_id = p_artwork_id THEN
      RETURN jsonb_build_object(
        'id', v_request.id,
        'status', v_request.status,
        'amount', v_request.amount,
        'currency', v_request.currency,
        'created_at', v_request.created_at
      );
    END IF;
    RAISE EXCEPTION 'This request reference has already been used.' USING ERRCODE = '23505';
  END IF;

  INSERT INTO public.notifications (id, recipient_id, type, title, body, link_url)
  VALUES (
    'ntf-' || gen_random_uuid()::text, v_collector_id, 'purchase_request_submitted',
    'Purchase request submitted',
    'Your request for ' || v_artwork.title || ' is awaiting administrator approval.',
    '/collection'
  );

  INSERT INTO public.notifications (id, recipient_id, type, title, body, link_url)
  SELECT
    'ntf-' || gen_random_uuid()::text, profile.id, 'purchase_request_submitted',
    'New purchase request',
    v_artwork.title || ' has a new collector purchase request.',
    '/admin'
  FROM public.profiles AS profile
  WHERE profile.role = 'admin' AND profile.account_status = 'active';

  RETURN jsonb_build_object(
    'id', v_request.id,
    'status', v_request.status,
    'amount', v_request.amount,
    'currency', v_request.currency,
    'created_at', v_request.created_at
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.decide_purchase_request(
  p_request_id text,
  p_decision text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_admin_id text := auth.uid()::text;
  v_request public.purchase_requests%ROWTYPE;
  v_artwork public.artworks%ROWTYPE;
  v_artist public.profiles%ROWTYPE;
  v_order_id text;
  v_purchase_id text;
  v_other_request record;
  v_artwork_id text;
BEGIN
  IF v_admin_id IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = v_admin_id AND role = 'admin' AND account_status = 'active'
  ) THEN
    RAISE EXCEPTION 'Administrator access is required.' USING ERRCODE = '42501';
  END IF;
  IF p_decision IS NULL OR p_decision NOT IN ('approve', 'reject') THEN
    RAISE EXCEPTION 'Decision must be approve or reject.' USING ERRCODE = '22023';
  END IF;

  SELECT artwork_id INTO v_artwork_id
  FROM public.purchase_requests
  WHERE id = p_request_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Purchase request not found.' USING ERRCODE = 'P0002';
  END IF;

  IF v_artwork_id IS NOT NULL THEN
    SELECT * INTO v_artwork
    FROM public.artworks
    WHERE id = v_artwork_id
    FOR UPDATE;
  END IF;

  SELECT * INTO v_request
  FROM public.purchase_requests
  WHERE id = p_request_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Purchase request not found.' USING ERRCODE = 'P0002';
  END IF;
  IF v_request.status <> 'pending' THEN
    RAISE EXCEPTION 'Only pending purchase requests can be decided.' USING ERRCODE = 'P0001';
  END IF;
  IF p_decision = 'approve' THEN
    IF v_request.collector_id IS NULL THEN
      RAISE EXCEPTION 'This legacy request is not linked to a collector account.' USING ERRCODE = 'P0001';
    END IF;
    IF v_request.artwork_id IS NULL OR v_artwork.id IS NULL
       OR v_artwork.availability <> 'available'
       OR v_artwork.sale_mode NOT IN ('buy_now', 'buy_now_and_negotiation') THEN
      RAISE EXCEPTION 'This artwork is no longer available for purchase.' USING ERRCODE = 'P0001';
    END IF;
    SELECT * INTO v_artist
    FROM public.profiles
    WHERE id = v_artwork.artist_id;
    IF NOT FOUND OR v_artist.role <> 'artist'
       OR v_artist.account_status <> 'active' OR v_artist.is_demo THEN
      RAISE EXCEPTION 'This artwork is no longer available for purchase.' USING ERRCODE = 'P0001';
    END IF;
    IF EXISTS (SELECT 1 FROM public.purchases WHERE artwork_id = v_artwork.id) THEN
      RAISE EXCEPTION 'This artwork already has an approved purchase.' USING ERRCODE = 'P0001';
    END IF;

    v_order_id := 'ord-pr-' || gen_random_uuid()::text;
    v_purchase_id := 'pur-pr-' || gen_random_uuid()::text;
    INSERT INTO public.orders (
      id, artwork_id, buyer_id, seller_id, amount, currency, status,
      shipping_city, collector_note, purchase_request_id
    ) VALUES (
      v_order_id, v_artwork.id, v_request.collector_id, v_artist.id,
      v_request.amount, v_request.currency, 'awaiting_payment',
      v_request.delivery_location, v_request.instructions, v_request.id
    );
    INSERT INTO public.purchases (
      id, artwork_id, collector_id, order_id, purchase_request_id,
      purchase_price, currency, payment_status, delivery_status
    ) VALUES (
      v_purchase_id, v_artwork.id, v_request.collector_id, v_order_id, v_request.id,
      v_request.amount, v_request.currency, 'pending', 'pending'
    );
    UPDATE public.artworks
    SET availability = 'sold', updated_at = now()
    WHERE id = v_artwork.id;
    UPDATE public.purchase_requests
    SET status = 'approved', admin_decided_by = v_admin_id, admin_decided_at = now(), updated_at = now()
    WHERE id = v_request.id;

    INSERT INTO public.notifications (id, recipient_id, type, title, body, link_url)
    VALUES (
      'ntf-' || gen_random_uuid()::text, v_request.collector_id, 'purchase_request_approved',
      'Purchase request approved',
      'Your request for ' || v_request.artwork_title || ' was approved. The administrator will coordinate payment and delivery.',
      '/collection'
    );

    FOR v_other_request IN
      UPDATE public.purchase_requests
      SET status = 'rejected', admin_decided_by = v_admin_id, admin_decided_at = now(), updated_at = now()
      WHERE artwork_id = v_artwork.id AND id <> v_request.id AND status = 'pending'
      RETURNING id, collector_id, artwork_title
    LOOP
      IF v_other_request.collector_id IS NOT NULL THEN
        INSERT INTO public.notifications (id, recipient_id, type, title, body, link_url)
        VALUES (
          'ntf-' || gen_random_uuid()::text, v_other_request.collector_id,
          'purchase_request_rejected', 'Artwork no longer available',
          'Another request for ' || v_other_request.artwork_title || ' was approved. This request is now closed.',
          '/collection'
        );
      END IF;
    END LOOP;
  ELSE
    UPDATE public.purchase_requests
    SET status = 'rejected', admin_decided_by = v_admin_id, admin_decided_at = now(), updated_at = now()
    WHERE id = v_request.id;

    IF v_request.collector_id IS NOT NULL THEN
      INSERT INTO public.notifications (id, recipient_id, type, title, body, link_url)
      VALUES (
        'ntf-' || gen_random_uuid()::text, v_request.collector_id, 'purchase_request_rejected',
        'Purchase request declined',
        'Your request for ' || v_request.artwork_title || ' was declined by the administrator.',
        '/collection'
      );
    END IF;
  END IF;

  RETURN jsonb_build_object('id', v_request.id, 'status', CASE WHEN p_decision = 'approve' THEN 'approved' ELSE 'rejected' END);
END;
$$;

CREATE OR REPLACE FUNCTION public.update_purchase_fulfillment(
  p_request_id text,
  p_action text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_admin_id text := auth.uid()::text;
  v_request public.purchase_requests%ROWTYPE;
  v_purchase public.purchases%ROWTYPE;
  v_order_status text;
BEGIN
  IF v_admin_id IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = v_admin_id AND role = 'admin' AND account_status = 'active'
  ) THEN
    RAISE EXCEPTION 'Administrator access is required.' USING ERRCODE = '42501';
  END IF;
  IF p_action IS NULL OR p_action NOT IN ('confirm_payment', 'confirm_delivery') THEN
    RAISE EXCEPTION 'Fulfillment action is invalid.' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_request
  FROM public.purchase_requests
  WHERE id = p_request_id
  FOR UPDATE;
  IF NOT FOUND OR v_request.status <> 'approved' THEN
    RAISE EXCEPTION 'An approved purchase request is required.' USING ERRCODE = 'P0001';
  END IF;
  SELECT * INTO v_purchase
  FROM public.purchases
  WHERE purchase_request_id = v_request.id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'The approved purchase record was not found.' USING ERRCODE = 'P0001';
  END IF;

  IF p_action = 'confirm_payment' THEN
    IF v_purchase.payment_status <> 'confirmed' THEN
      UPDATE public.purchases
      SET payment_status = 'confirmed', payment_confirmed_by = v_admin_id,
          payment_confirmed_at = now()
      WHERE id = v_purchase.id;
    END IF;
    IF v_purchase.delivery_status <> 'confirmed' THEN
      UPDATE public.orders SET status = 'paid' WHERE id = v_purchase.order_id;
    END IF;
  ELSE
    IF v_purchase.payment_status <> 'confirmed' THEN
      RAISE EXCEPTION 'Payment must be confirmed before delivery.' USING ERRCODE = 'P0001';
    END IF;
    IF v_purchase.delivery_status <> 'confirmed' THEN
      UPDATE public.purchases
      SET delivery_status = 'confirmed', delivery_confirmed_by = v_admin_id,
          delivery_confirmed_at = now()
      WHERE id = v_purchase.id;
    END IF;
    UPDATE public.orders SET status = 'delivered' WHERE id = v_purchase.order_id;
  END IF;

  SELECT payment_status INTO v_purchase.payment_status
  FROM public.purchases WHERE id = v_purchase.id;
  SELECT delivery_status INTO v_purchase.delivery_status
  FROM public.purchases WHERE id = v_purchase.id;
  SELECT status INTO v_order_status
  FROM public.purchase_requests WHERE id = v_request.id;

  RETURN jsonb_build_object(
    'id', v_request.id,
    'status', v_order_status,
    'payment_status', v_purchase.payment_status,
    'delivery_status', v_purchase.delivery_status
  );
END;
$$;

REVOKE ALL ON FUNCTION public.submit_purchase_request(text, text, text, text, text, text, text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.decide_purchase_request(text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.update_purchase_fulfillment(text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.prevent_deleting_purchased_artwork() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.submit_purchase_request(text, text, text, text, text, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.decide_purchase_request(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_purchase_fulfillment(text, text) TO authenticated;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime')
     AND NOT EXISTS (
       SELECT 1 FROM pg_publication_tables
       WHERE pubname = 'supabase_realtime'
         AND schemaname = 'public'
         AND tablename = 'notifications'
     ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime')
     AND NOT EXISTS (
       SELECT 1 FROM pg_publication_tables
       WHERE pubname = 'supabase_realtime'
         AND schemaname = 'public'
         AND tablename = 'artworks'
     ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.artworks;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime')
     AND NOT EXISTS (
       SELECT 1 FROM pg_publication_tables
       WHERE pubname = 'supabase_realtime'
         AND schemaname = 'public'
         AND tablename = 'purchases'
     ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.purchases;
  END IF;
END;
$$;
