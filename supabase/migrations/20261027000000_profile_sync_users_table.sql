-- Ensure profile registration dates are available for administrator analytics.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS registration_date timestamptz;

UPDATE public.profiles
SET registration_date = created_at
WHERE registration_date IS NULL;

ALTER TABLE public.profiles
  ALTER COLUMN registration_date SET DEFAULT now(),
  ALTER COLUMN registration_date SET NOT NULL;
