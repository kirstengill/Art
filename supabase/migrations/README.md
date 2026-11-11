# Supabase Database Migrations

Louvre Singa uses the existing Supabase project (`majessboafhzardtmb`) as its only persistent database, authentication provider, and artwork image store. The Express API uses the Supabase JavaScript client with user access tokens for ordinary operations. Trusted profile synchronization and administrator queries use a server-only Supabase secret.

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
- `20261027000000_profile_sync_users_table.sql` ensures `profiles.registration_date` exists. The legacy `public.users` mirror is no longer created or used; if it already exists, Louvre Singa leaves it untouched to avoid data loss.
- `20261027000001_supabase_runtime_security.sql` adds missing `is_demo` fields and tightens profile role, artwork ownership, order, conversation, offer, and Storage permissions. `profiles.role` cannot be changed through authenticated profile updates, and artwork uploads require an artist profile and the uploader's own folder.
- `20261103000001_admin_mediated_purchase_requests.sql` adds a separate, RLS-enabled request table for administrator-mediated collector requests. Direct client access is revoked.
- `20261103000000_restrict_public_profile_columns.sql` removes broad profile-table SELECT grants and restores access only to the public profile columns. This preserves the existing RLS row policies while preventing anonymous or authenticated clients from selecting private profile fields such as email.
- `20261111000001_admin_artwork_deletion_and_categories.sql` adds active-administrator-only artwork and image deletion policies, preserves purchase-request history while unlinking deleted artworks, and adds the `other` artwork category.
- `20261111000002_purchase_approval_and_fulfillment.sql` links requests to authenticated collectors, adds administrator decision and fulfillment audit fields, and defines transactional RPCs for submissions, approval/rejection, and separate payment/delivery confirmation. Approval locks and marks the artwork sold, creates the collector purchase/order, rejects competing pending requests, and sends notifications. Artworks with approved purchases cannot be deleted. Realtime notifications, purchase updates, and artwork changes are enabled where the Supabase project supports Realtime.

The application does not require separate PostgreSQL host, database, or login credentials. Do not drop legacy tables or delete data as part of this migration.

## Supabase dashboard and deployment configuration

- Enable Supabase Auth email/password sign-in and configure allowed redirect URLs for localhost and the deployed origin.
- Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in the browser build environment.
- Set `SUPABASE_URL`/`SUPABASE_ANON_KEY` (or the existing `VITE_` equivalents) and `SUPABASE_SECRET_KEY` only in the trusted server environment. Never expose the secret with a `VITE_` prefix.
- The authenticated user's `public.profiles.role` is the authority for dashboard and admin API access. Assign an administrator role only through a trusted database operation; signup metadata and authenticated profile updates cannot grant admin access.
- The `artwork-images` bucket is public for image reads. Its Storage policies restrict writes to artist-owned folders and the existing 10 MB JPEG/PNG/WebP/GIF limits.

No live payment provider, escrow, or automatic payout process is configured. Administrators can separately record payment receipt and verified delivery; the intended 20% Louvre Singa / 80% artist split and post-delivery artist payout remain manual. Approval alone does not represent collected funds or completed delivery.
