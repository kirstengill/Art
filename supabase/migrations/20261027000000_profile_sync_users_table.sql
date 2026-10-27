-- Create the runtime users table required by Drizzle profile synchronization.
-- Apply this migration to the PostgreSQL database configured by SQL_*.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS registration_date timestamptz;

UPDATE public.profiles
SET registration_date = created_at
WHERE registration_date IS NULL;

ALTER TABLE public.profiles
  ALTER COLUMN registration_date SET DEFAULT now(),
  ALTER COLUMN registration_date SET NOT NULL;

CREATE TABLE IF NOT EXISTS public.users (
  id serial PRIMARY KEY,
  uid text NOT NULL,
  email text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS users_uid_unique
  ON public.users (uid);

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon')
     AND EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    EXECUTE 'ALTER TABLE public.users ENABLE ROW LEVEL SECURITY';
    EXECUTE 'REVOKE ALL ON TABLE public.users FROM PUBLIC, anon, authenticated';
  END IF;
END
$$;
