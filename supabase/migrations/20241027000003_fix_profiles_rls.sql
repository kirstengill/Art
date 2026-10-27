-- Migration: 20241027000003_fix_profiles_rls
-- Description: Allow public access to eligible artist profiles without exposing private fields
-- Author: Artivora System
-- Created: 2024-10-27

-- ============================================
-- Replace broad profile reads with owner access and eligible public artist access
-- ============================================

-- Drop the restrictive policy that limits SELECT to own profile only
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Public can view public profile info" ON public.profiles;
DROP POLICY IF EXISTS "Public can view profile information" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

-- ============================================
-- RECREATE PROFILES POLICIES WITH CORRECT ORDER
-- ============================================

CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid()::text = id);

CREATE POLICY "Public can view active artist profiles"
  ON public.profiles FOR SELECT
  USING (role = 'artist' AND account_status = 'active' AND is_demo = false);

-- RLS filters rows; column grants keep private profile data out of public reads.
REVOKE SELECT ON TABLE public.profiles FROM PUBLIC, anon, authenticated;
GRANT SELECT (
  id,
  full_name,
  handle,
  username,
  role,
  avatar_url,
  cover_url,
  bio,
  location,
  discipline,
  verified,
  account_status,
  registration_date,
  created_at,
  updated_at,
  is_demo
) ON TABLE public.profiles TO anon, authenticated;

-- Users can update their own profile
CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid()::text = id)
  WITH CHECK (auth.uid()::text = id);

-- ============================================
-- VERIFICATION QUERY (optional, for debugging)
-- ============================================
-- To verify this worked, run:
-- SELECT polname, roles, cmd, perm FROM pg_policies WHERE tablename = 'profiles';
