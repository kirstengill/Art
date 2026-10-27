-- Migration: 20241027000002_add_user_fields
-- Description: Add username, account_status, registration_date fields to profiles and user_account_details
-- Author: Artivora System
-- Created: 2024-10-27

-- ============================================
-- ADD MISSING FIELDS TO PROFILES TABLE
-- ============================================

-- Add username column (unique)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'username'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN username text;
    ALTER TABLE public.profiles ADD CONSTRAINT profiles_username_unique UNIQUE (username);
    
    -- Set default username for existing users
    UPDATE public.profiles 
    SET username = handle 
    WHERE username IS NULL;
    
    ALTER TABLE public.profiles ALTER COLUMN username SET NOT NULL;
  END IF;
END $$;

-- Add account_status column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'account_status'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN account_status text DEFAULT 'active';
    ALTER TABLE public.profiles ADD CONSTRAINT profiles_account_status_check 
      CHECK (account_status IN ('active', 'pending', 'suspended', 'deleted'));
  END IF;
END $$;

-- Add registration_date column (for admin analytics)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'registration_date'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN registration_date timestamptz DEFAULT now();
    
    -- Set registration_date to created_at for existing users
    UPDATE public.profiles 
    SET registration_date = created_at 
    WHERE registration_date IS NULL;
    
    ALTER TABLE public.profiles ALTER COLUMN registration_date SET NOT NULL;
  END IF;
END $$;

-- ============================================
-- ADD ADDITIONAL FIELDS TO USER ACCOUNT DETAILS
-- ============================================

-- Add address, city, country, postal_code, date_of_birth to user_account_details
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_account_details' AND column_name = 'address'
  ) THEN
    ALTER TABLE public.user_account_details ADD COLUMN address text;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_account_details' AND column_name = 'city'
  ) THEN
    ALTER TABLE public.user_account_details ADD COLUMN city text;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_account_details' AND column_name = 'country'
  ) THEN
    ALTER TABLE public.user_account_details ADD COLUMN country text;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_account_details' AND column_name = 'postal_code'
  ) THEN
    ALTER TABLE public.user_account_details ADD COLUMN postal_code text;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_account_details' AND column_name = 'date_of_birth'
  ) THEN
    ALTER TABLE public.user_account_details ADD COLUMN date_of_birth date;
  END IF;
END $$;

-- ============================================
-- UPDATE STORAGE BUCKET FOR NEW FILE SIZE AND TYPES
-- ============================================

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
