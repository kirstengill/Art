# Supabase Database Migrations

Artivora uses the existing Supabase project (`majessboafhzardtmb`) as its only persistent database, authentication provider, and artwork image store. The Express API uses the Supabase JavaScript client with user access tokens for ordinary operations. Trusted profile synchronization and allowlisted administrator queries use a server-only Supabase secret.

## Migration history

Apply migrations in filename order with the Supabase CLI after linking the existing project:

```powershell
npx supabase link --project-ref majessboafhzardtmb
npx supabase db push
```

Review the SQL and the target project before applying. Do not execute `supabase/schema.sql` as a fresh schema against this existing project; it is a historical reference snapshot.

- `20241027000000_initial_schema.sql` creates the core profile, artwork, community, collection, inquiry, offer, order, purchase, and notification tables.
- `20241027000001_rls_policies.sql` enables RLS, defines the existing read/write policies, and configures the public `artwork-images` bucket with a 10 MB limit and image MIME restrictions.
- `20241027000002_add_user_fields.sql` adds the original account fields and bucket configuration.
- `20241027000003_fix_profiles_rls.sql` limits public profile visibility to active, non-demo artists and grants only public profile columns.
- `20261027000000_profile_sync_users_table.sql` ensures `profiles.registration_date` exists. The legacy `public.users` mirror is no longer created or used; if it already exists, Artivora leaves it untouched to avoid data loss.
- `20261027000001_supabase_runtime_security.sql` adds missing `is_demo` fields and tightens profile role, artwork ownership, order, conversation, offer, and Storage permissions. `profiles.role` cannot be changed through authenticated profile updates, and artwork uploads require an artist profile and the uploader's own folder.

The application does not require separate PostgreSQL host, database, or login credentials. Do not drop legacy tables or delete data as part of this migration.

## Supabase dashboard and deployment configuration

- Enable Supabase Auth email/password sign-in and configure allowed redirect URLs for localhost and the deployed origin.
- Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in the browser build environment.
- Set `SUPABASE_URL`/`SUPABASE_ANON_KEY` (or the existing `VITE_` equivalents) and `SUPABASE_SECRET_KEY` only in the trusted server environment. Never expose the secret with a `VITE_` prefix.
- Set server-only `ADMIN_UIDS` to the intended administrator Auth user IDs. Signup metadata or profile updates do not grant admin access.
- The `artwork-images` bucket is public for image reads. Its Storage policies restrict writes to artist-owned folders and the existing 10 MB JPEG/PNG/WebP/GIF limits.

No live payment provider, delivery verification, escrow, or payout process is configured. The intended 20% Artivora / 80% artist split and post-delivery payout remain manual business requirements; purchase intents do not represent collected funds or completed purchases.
