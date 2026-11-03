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
