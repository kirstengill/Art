-- Migration: 20261110000000_collector_approval_and_new_features
-- Description: Add collector approval workflow, new artwork categories, donations, and exhibitions
-- Author: Louvre Singa System
-- Created: 2026-11-10

-- ============================================
-- 1. UPDATE PROFILES TABLE - Add collector approval fields
-- ============================================
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS collector_approved_at timestamptz,
ADD COLUMN IF NOT EXISTS collector_approved_by text REFERENCES public.profiles(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS collector_rejection_reason text;

-- Update account_status check constraint to include pending_approval
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_account_status_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_account_status_check 
  CHECK (account_status IN ('active', 'pending', 'pending_approval', 'suspended', 'deleted'));

-- Create index for collector approval queries
CREATE INDEX IF NOT EXISTS idx_profiles_collector_approved ON public.profiles(collector_approved_at) 
  WHERE collector_approved_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_profiles_account_status_role ON public.profiles(account_status, role);

-- ============================================
-- 2. UPDATE ARTWORKS TABLE - Add new categories
-- ============================================
ALTER TABLE public.artworks DROP CONSTRAINT IF EXISTS artworks_category_check;
ALTER TABLE public.artworks ADD CONSTRAINT artworks_category_check 
  CHECK (category IN ('painting', 'photography', 'sculpture', 'drawing', 'digital_art', 'mixed_media', 'ceramics'));

-- ============================================
-- 3. CREATE DONATIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.donations (
  id text PRIMARY KEY,
  donor_id text NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  artist_id text REFERENCES public.profiles(id) ON DELETE SET NULL,
  artwork_id text REFERENCES public.artworks(id) ON DELETE SET NULL,
  amount integer NOT NULL CHECK (amount > 0),
  currency text NOT NULL DEFAULT 'USD',
  message text,
  is_anonymous boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'refunded', 'failed')),
  payment_reference text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_donations_donor_id ON public.donations(donor_id);
CREATE INDEX IF NOT EXISTS idx_donations_artist_id ON public.donations(artist_id);
CREATE INDEX IF NOT EXISTS idx_donations_artwork_id ON public.donations(artwork_id);
CREATE INDEX IF NOT EXISTS idx_donations_created_at ON public.donations(created_at);
CREATE INDEX IF NOT EXISTS idx_donations_status ON public.donations(status);

-- ============================================
-- 4. CREATE EXHIBITIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.exhibitions (
  id text PRIMARY KEY,
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  curator_id text REFERENCES public.profiles(id) ON DELETE SET NULL,
  cover_image_key text,
  start_date date NOT NULL,
  end_date date NOT NULL,
  location text,
  is_virtual boolean NOT NULL DEFAULT false,
  virtual_url text,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'active', 'archived', 'cancelled')),
  featured boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_exhibitions_curator_id ON public.exhibitions(curator_id);
CREATE INDEX IF NOT EXISTS idx_exhibitions_status ON public.exhibitions(status);
CREATE INDEX IF NOT EXISTS idx_exhibitions_dates ON public.exhibitions(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_exhibitions_featured ON public.exhibitions(featured);

-- ============================================
-- 5. CREATE EXHIBITION ARTWORKS TABLE (junction)
-- ============================================
CREATE TABLE IF NOT EXISTS public.exhibition_artworks (
  id serial PRIMARY KEY,
  exhibition_id text NOT NULL REFERENCES public.exhibitions(id) ON DELETE CASCADE,
  artwork_id text NOT NULL REFERENCES public.artworks(id) ON DELETE CASCADE,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (exhibition_id, artwork_id)
);

CREATE INDEX IF NOT EXISTS idx_exhibition_artworks_exhibition_id ON public.exhibition_artworks(exhibition_id);
CREATE INDEX IF NOT EXISTS idx_exhibition_artworks_artwork_id ON public.exhibition_artworks(artwork_id);

-- ============================================
-- 6. CREATE EXHIBITION SUBMISSIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.exhibition_submissions (
  id text PRIMARY KEY,
  exhibition_id text NOT NULL REFERENCES public.exhibitions(id) ON DELETE CASCADE,
  artist_id text NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  artwork_id text NOT NULL REFERENCES public.artworks(id) ON DELETE CASCADE,
  curator_notes text,
  status text NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted', 'under_review', 'accepted', 'rejected', 'withdrawn')),
  submitted_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz,
  reviewed_by text REFERENCES public.profiles(id) ON DELETE SET NULL,
  UNIQUE (exhibition_id, artwork_id)
);

CREATE INDEX IF NOT EXISTS idx_exhibition_submissions_exhibition_id ON public.exhibition_submissions(exhibition_id);
CREATE INDEX IF NOT EXISTS idx_exhibition_submissions_artist_id ON public.exhibition_submissions(artist_id);
CREATE INDEX IF NOT EXISTS idx_exhibition_submissions_status ON public.exhibition_submissions(status);

-- ============================================
-- 7. RLS POLICIES FOR DONATIONS
-- ============================================
ALTER TABLE public.donations ENABLE ROW LEVEL SECURITY;

-- Donors can view their own donations
CREATE POLICY "donations_select_own" ON public.donations
  FOR SELECT USING (auth.uid()::text = donor_id);

-- Donors can insert their own donations
CREATE POLICY "donations_insert_own" ON public.donations
  FOR INSERT WITH CHECK (auth.uid()::text = donor_id);

-- Artists can view donations to their artworks
CREATE POLICY "donations_select_artist" ON public.donations
  FOR SELECT USING (
    auth.uid()::text = artist_id
  );

-- Admins can view all donations
CREATE POLICY "donations_select_admin" ON public.donations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()::text AND role = 'admin'
    )
  );

-- Admins can update donation status
CREATE POLICY "donations_update_admin" ON public.donations
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()::text AND role = 'admin'
    )
  );

-- ============================================
-- 8. RLS POLICIES FOR EXHIBITIONS
-- ============================================
ALTER TABLE public.exhibitions ENABLE ROW LEVEL SECURITY;

-- Public can view active/scheduled exhibitions
CREATE POLICY "exhibitions_select_public" ON public.exhibitions
  FOR SELECT USING (
    status IN ('scheduled', 'active', 'archived')
  );

-- Curators (admins) can manage exhibitions
CREATE POLICY "exhibitions_all_admin" ON public.exhibitions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()::text AND role = 'admin'
    )
  );

-- ============================================
-- 9. RLS POLICIES FOR EXHIBITION_ARTWORKS
-- ============================================
ALTER TABLE public.exhibition_artworks ENABLE ROW LEVEL SECURITY;

-- Public can view artworks in public exhibitions
CREATE POLICY "exhibition_artworks_select_public" ON public.exhibition_artworks
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.exhibitions e
      WHERE e.id = exhibition_id AND e.status IN ('scheduled', 'active', 'archived')
    )
  );

-- Admins can manage exhibition artworks
CREATE POLICY "exhibition_artworks_all_admin" ON public.exhibition_artworks
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()::text AND role = 'admin'
    )
  );

-- ============================================
-- 10. RLS POLICIES FOR EXHIBITION_SUBMISSIONS
-- ============================================
ALTER TABLE public.exhibition_submissions ENABLE ROW LEVEL SECURITY;

-- Artists can view their own submissions
CREATE POLICY "exhibition_submissions_select_own" ON public.exhibition_submissions
  FOR SELECT USING (auth.uid()::text = artist_id);

-- Artists can submit artworks to exhibitions
CREATE POLICY "exhibition_submissions_insert_own" ON public.exhibition_submissions
  FOR INSERT WITH CHECK (auth.uid()::text = artist_id);

-- Artists can withdraw their own submissions
CREATE POLICY "exhibition_submissions_update_own" ON public.exhibition_submissions
  FOR UPDATE USING (auth.uid()::text = artist_id AND status IN ('submitted', 'under_review'))
  WITH CHECK (auth.uid()::text = artist_id AND status = 'withdrawn');

-- Admins can manage all submissions
CREATE POLICY "exhibition_submissions_all_admin" ON public.exhibition_submissions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()::text AND role = 'admin'
    )
  );

-- ============================================
-- 11. UPDATE PROFILES RLS FOR COLLECTOR APPROVAL
-- ============================================
-- Collectors with pending_approval status cannot access collector features
-- This is enforced at application level, but we add a policy for data visibility

-- Allow admins to update collector approval status
CREATE POLICY "profiles_update_collector_approval_admin" ON public.profiles
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()::text AND role = 'admin'
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()::text AND role = 'admin'
    )
  );

-- ============================================
-- 12. HELPER FUNCTIONS
-- ============================================

-- Function to check if a user is an approved collector
CREATE OR REPLACE FUNCTION public.is_approved_collector(user_id text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
AS $$
  SELECT role = 'collector' AND account_status = 'active' AND collector_approved_at IS NOT NULL
  FROM public.profiles
  WHERE id = user_id;
$$;

-- Function to check if a user can make purchases/offers
CREATE OR REPLACE FUNCTION public.can_purchase_or_offer(user_id text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
AS $$
  SELECT 
    CASE 
      WHEN role = 'collector' THEN account_status = 'active' AND collector_approved_at IS NOT NULL
      WHEN role = 'admin' THEN true
      ELSE false
    END
  FROM public.profiles
  WHERE id = user_id;
$$;

-- Function to check if a user can upload artwork
CREATE OR REPLACE FUNCTION public.can_upload_artwork(user_id text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
AS $$
  SELECT role IN ('artist', 'admin') AND account_status = 'active'
  FROM public.profiles
  WHERE id = user_id;
$$;

-- Function to check if a user can create posts
CREATE OR REPLACE FUNCTION public.can_create_posts(user_id text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
AS $$
  SELECT role IN ('artist', 'admin') AND account_status = 'active'
  FROM public.profiles
  WHERE id = user_id;
$$;