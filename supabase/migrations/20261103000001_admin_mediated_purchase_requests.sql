CREATE TABLE IF NOT EXISTS public.purchase_requests (
  id text PRIMARY KEY,
  request_id text NOT NULL UNIQUE,
  artwork_id text NOT NULL REFERENCES public.artworks(id) ON DELETE RESTRICT,
  artist_id text NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  buyer_name text NOT NULL,
  buyer_phone text NOT NULL,
  buyer_email text NOT NULL DEFAULT '',
  delivery_location text NOT NULL,
  delivery_address text NOT NULL,
  instructions text NOT NULL DEFAULT '',
  artwork_title text NOT NULL,
  artwork_image text NOT NULL,
  artist_name text NOT NULL,
  artist_handle text NOT NULL DEFAULT '',
  amount integer NOT NULL CHECK (amount > 0),
  currency text NOT NULL,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'confirmed', 'paid', 'delivered', 'completed', 'cancelled')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_purchase_requests_created_at
  ON public.purchase_requests (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_purchase_requests_status
  ON public.purchase_requests (status);

ALTER TABLE public.purchase_requests ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.purchase_requests FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.purchase_requests TO service_role;
