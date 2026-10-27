# Artivora Database Migrations

This directory contains versioned SQL migration files for Artivora's PostgreSQL schema. The Express/Drizzle application connects to the server-configured `SQL_*` database; Supabase Auth and Storage are separate services.

## Migration Files

### 1. `20241027000000_initial_schema.sql`
Initial database schema with all required tables:
- **profiles** - User profile information with username, accountStatus, registrationDate
- **user_account_details** - Private user information (first name, last name, phone, address, etc.)
- **artworks** - Artwork listings with all metadata
- **posts** - Community posts
- **comments** - Post comments
- **likes** - Post like tracking
- **follows** - Artist follow relationships
- **collections** - User art collections
- **collection_items** - Artwork items in collections
- **conversations** - Private messages between collectors and artists
- **conversation_participants** - Conversation participant tracking
- **messages** - Conversation messages
- **artwork_offers** - Negotiation offers
- **orders** - Purchase orders
- **purchases** - Completed purchases
- **notifications** - User notifications

All tables include appropriate indexes for query performance.

### 2. `20241027000001_rls_policies.sql`
Row Level Security (RLS) policies for all tables:
- Users can only access their own private data
- Public data (artworks, posts) is viewable by everyone
- Artists can only manage their own artworks
- Conversation participants can only access their own conversations and messages
- Admin-only operations are protected

Storage policies:
- Artwork images bucket is public for reads
- Authenticated users can upload to their own user folder in the artwork-images bucket

### 3. `20241027000002_add_user_fields.sql`
Adds additional fields to existing tables:
- **profiles**: username (unique), accountStatus, registrationDate
- **user_account_details**: address, city, country, postalCode, dateOfBirth
- **storage.buckets**: Updates artwork-images bucket with 10MB limit and support for GIF format

### 4. `20241027000003_fix_profiles_rls.sql`
Restricts public profile reads to active, non-demo artist accounts and grants access only to public profile columns. Email and phone details remain private.

### 5. `20261027000000_profile_sync_users_table.sql`
Adds the `profiles.registration_date` field (backfilled from the existing registration timestamp) and creates the `users` table required by the Express/Drizzle profile-sync transaction. Apply this migration to the same PostgreSQL database configured by the server's `SQL_HOST`, `SQL_DB_NAME`, `SQL_USER`, and `SQL_PASSWORD` variables. Supabase Auth and Storage do not imply that this separate runtime PostgreSQL database has received the migration.

## Running Migrations

### Local Development

Use these commands only when the target PostgreSQL instance is the Supabase database:

```bash
# Start Supabase locally
npx supabase start

# Apply migrations
npx supabase db push
```

### Production Deployment

To deploy Supabase-targeted migrations:

```bash
# Link your project (if not already linked)
npx supabase link --project-ref your-project-ref

# Push migrations to Supabase
npx supabase db push
```

Or use the Supabase Dashboard to upload and run SQL files manually. The Express runtime schema migration must be applied to the PostgreSQL instance configured by `SQL_*`; applying it to Supabase does not change a separate Cloud SQL database.

## Migration Order

Migrations must be applied in numerical order:
1. `20241027000000_initial_schema.sql` - Base schema
2. `20241027000001_rls_policies.sql` - Security policies
3. `20241027000002_add_user_fields.sql` - Additional fields
4. `20241027000003_fix_profiles_rls.sql` - Safe public artist profile access
5. `20261027000000_profile_sync_users_table.sql` - Runtime PostgreSQL user records

The Express/Drizzle API uses its configured `SQL_*` PostgreSQL database for profiles, account details, and artwork. Apply runtime database migrations to that database, not to Supabase Auth/Storage by assumption.

## Database Schema Summary

### User Management
- **profiles**: Public user profiles with role-based access control
- **user_account_details**: Private user information (RLS protected)
- **users**: Authentication user records

### Content
- **artworks**: Artist-published artwork listings
- **posts**: Community discussion posts
- **comments**: Replies to posts

### Interactions
- **likes**: User likes on posts
- **follows**: Artist follower relationships
- **collections**: User-created artwork collections
- **collection_items**: Items in collections

### Commerce
- **conversations**: Private chat between collectors and artists
- **messages**: Chat messages
- **artwork_offers**: Negotiation offers
- **orders**: Purchase intents
- **purchases**: Completed acquisitions

### Notifications
- **notifications**: System notifications for users

## Security Notes

- All tables have RLS enabled by default
- Private data is protected with user-specific policies
- Public data uses permissive read policies
- Admin operations require the ADMIN_UIDS environment variable
- Storage uploads are restricted to authenticated users and their own directories

## Environment Variables

Required for admin functionality:
- `ADMIN_UIDS` - Comma-separated list of user IDs with admin privileges

## Supabase Configuration

- **Project ID**: majessboafhzardtmb
- **Region**: eu-central-1
- **Storage Bucket**: artwork-images (public, 10MB max, supports jpeg/png/webp/gif)

## References

- [Supabase Database Migrations](https://supabase.com/docs/guides/deployment/database-migrations)
- [Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Storage Policies](https://supabase.com/docs/guides/storage)
