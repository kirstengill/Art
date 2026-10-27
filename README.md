# ARTIVORA — Contemporary Fine-Art Gallery & Collector Platform

ARTIVORA is a digital fine-art gallery and collector community where artists publish original works with transparent acquisition modes, collectors purchase or negotiate artwork-linked offers, and art enthusiasts engage with studio dispatches.

## User Roles

ARTIVORA implements a **role-based access control system** with three user types:

| Role | Can Browse | Can Purchase | Can Upload Artwork | Can Create Posts | Can Negotiate | Has Collection |
|------|------------|--------------|------------------|-----------------|---------------|----------------|
| **Art Lover** | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Collector** | ✅ | ✅ | ❌ | ❌ | ✅ | ✅ |
| **Artist** | ✅ | ❌ | ✅ | ✅ | ❌ | ❌ |

**Note:** All artwork is **publicly visible** to all users regardless of account type or authentication status.

## Features Implemented

- **Discover / Exhibition Salon (`/`)**: Editorial hero, featured studio works, thematic collector capsules, featured artist roster, and community journal dispatches.
- **Artwork Gallery (`/gallery`)**: Responsive catalogue with search by title, medium, or artist; category filters (`Painting`, `Photography`, `Sculpture`, `Drawing`, `Digital Art`); Saved shortlist filter; and sorting by newest, price, or popularity.
- **Artwork Details (`/artwork/:id`)**: High-resolution framing & surface inspection views, lightbox plate viewer, museum accession metadata (`dl`), and three artist-selectable sales modes:
  1. `Buy Now` (opens an honest Purchase-Intent / Checkout Preview modal without claiming payment completion)
  2. `Negotiation Only` (private collector offer workflow)
  3. `Buy Now + Negotiation`
- **Artists Directory & Studio Profiles (`/artists`, `/artists/:id`)**: Atelier cover photography, artist biographies, portfolio grids, follow controls, and direct studio inquiry actions.
- **Community Journal (`/community`)**: Post composer with optional catalogue artwork reference, appreciation likes, expandable comments, share links, and atelier follow controls.
- **Private Messages & Price Negotiation (`/messages`)**:
  - 3-column desktop layout (Inbox · Private Conversation · Artwork & Offer Dossier) and responsive mobile inbox/chat/drawer layout.
  - Every thread is linked to a specific artwork and tracks `pending`, `accepted`, `rejected`, `countered`, `withdrawn`, and `expired` offer states.
  - Messaging, offers, responses, and purchase intents require a signed-in account and are persisted through the API.
  - **Collectors only**: Can create offers and negotiate prices

- **Collector Collection Gallery (`/collection`)**:
  - **Collectors only**: View all purchased artworks in a personal gallery
  - Tracks total amount spent on acquisitions
  - Shows purchased artwork with all details
  - Responsive grid layout matching the main gallery style
- **Artist Studio Dashboard & Add Artwork (`/dashboard`, `/add-artwork`)**: Create, preview, edit, and remove listings with image upload, studio presets, and inline form validation.
- **Authentication (`/login`, `/signup`)**: Supabase Auth manages email/password accounts for `Admin`, `Artist`, `Collector`, and `Art Lover`. Public registration is limited to Artist, Collector, and Art Lover. Passwords are never stored in application tables; first/last name and phone details are stored separately from the public profile.
  - **Role selection**: Users choose their role during signup (Artist, Collector, or Art Lover)
  - **Role switching**: Users can create multiple accounts with different roles
- **Page transitions**: Route changes use lightweight Motion transitions and respect the user's reduced-motion preference.
- **Helpline**: Footer links for WhatsApp, X/Twitter, and Etsy are enabled through configured official destinations; unset links are not fabricated.
- **Artist artwork uploads**: Uploaded JPEG, PNG, and WebP images are stored in the public `artwork-images` Supabase Storage bucket. Artwork records store the resulting public Supabase URL, so the image is available across browsers and to all visitors.
- **Role-based access**: Users can sign up as **Artist**, **Collector**, or **Art Lover**. Each role has specific permissions for browsing, purchasing, uploading, and collecting artwork.

## Architecture & Database Setup

1. **Managed PostgreSQL + Express API (`server.ts`, `src/db/schema.ts`, `src/db/repository.ts`)**:
   - Uses Drizzle ORM (`pg` connection pool) across 14 domain tables (`profiles`, `artworks`, `posts`, `comments`, `likes`, `follows`, `collections`, `collection_items`, `conversations`, `conversation_participants`, `messages`, `artwork_offers`, `orders`, `notifications`) plus `users` and private `user_account_details`.
   - Enforces ownership checks on artwork edits/deletions, artist-only publishing, participant-only access on conversations/messages/offers, and server-side offer state transition & order price validation.
2. **Supabase Auth, Storage & Client (`src/lib/supabase.ts`, `supabase/schema.sql`)**:
   - Uses Supabase Auth as the sole authentication provider for email/password. The browser uses only the publishable/anon key; the server validates bearer tokens with Supabase Auth before PostgreSQL API access.
   - Artist-uploaded artwork images are uploaded to the public `artwork-images` Storage bucket. Its policies permit public reads and authenticated uploads only to the uploader's own folder. The artwork record contains the bucket's public URL; images are not saved as data URLs in PostgreSQL.
   - Includes a typed Supabase client and Realtime channel helper, plus SQL DDL, Storage bucket configuration, and Row-Level Security policies in `supabase/schema.sql` for standalone Supabase + Vercel deployments. The current Express/Drizzle application data remains in PostgreSQL.
3. **Administrator Dashboard (`/admin`)**:
   - Reads live user and profile counts, artwork listings, community posts, and purchase intents from the PostgreSQL tables used by the Express/Drizzle backend. The reference Supabase schema is not used as a second data source by this dashboard.
   - Supabase Auth access tokens are verified by the server, then the server checks the authenticated user ID against the server-only `ADMIN_UIDS` allowlist before any `/api/admin/*` query. Configure one or more Supabase Auth user IDs (UUIDs, comma-separated) in the server environment; public sign-up and editable profile roles do not grant admin access.
   - The account, listing, community post, and purchase-intent tables are `users`, `profiles`, `artworks`, `posts`, and `orders`. `profiles.id` links to `users.uid`; `artworks.artist_id` and `posts.author_id` link to `profiles.id`; orders link to buyer/seller profiles and artwork. Legacy rows flagged as demo are excluded from public catalog responses.
   - The current `orders` schema records only `intent_created`, `awaiting_payment`, and `cancelled`; there are no payment, deposit, refund, payout, or completed-sale records. The dashboard labels these as purchase intents and reports payment integration as not configured.

## Getting Started

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Copy `.env.example` to `.env` and populate the required placeholders (never commit real secrets):

- `SQL_HOST`, `SQL_DB_NAME`, `SQL_USER`, `SQL_PASSWORD` (PostgreSQL runtime credentials)
- `SQL_ADMIN_USER`, `SQL_ADMIN_PASSWORD` (for Drizzle schema updates)
- `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (required for Supabase authentication; use only the publishable/anon key in the browser)
- `ADMIN_UIDS` (server-only comma-separated Supabase Auth user IDs for administrator access; do not use a `VITE_` prefix)
- `VITE_HELPLINE_WHATSAPP_URL`, `VITE_HELPLINE_X_URL`, `VITE_HELPLINE_ETSY_URL` (optional official HTTPS destinations for the footer icons)

Apply the updated PostgreSQL schema, including the private account-details table, with `npx drizzle-kit push --config=src/db/drizzle.config.ts` after setting the `SQL_ADMIN_*` values. Review schema changes before applying them to a production database.

The application no longer provides demo accounts, seeded sample content, or demo-mode actions. If a PostgreSQL database still contains legacy rows marked `is_demo = true`, back up and review the explicitly destructive cleanup script at [`scripts/remove_demo_data.sql`](./scripts/remove_demo_data.sql) before running it against that database. Public catalog and conversation APIs exclude those legacy rows until cleanup is applied.

### Supabase Auth Setup

1. Enable email/password authentication in the Supabase dashboard. Configure email confirmation according to your deployment policy.
2. Add each app callback URL to Supabase Auth's allowed redirect URLs, including `http://localhost:3000/auth/callback` for local development and the corresponding URL for each deployed origin.
3. Add administrator Supabase Auth user UUIDs to the server-only `ADMIN_UIDS` variable. Never use mutable role metadata to grant administrator access; public registration cannot create Admin accounts.
4. Run `supabase/schema.sql` in the Supabase SQL Editor to create/configure the public `artwork-images` Storage bucket and its upload/read policies, as well as the reference database schema.
5. Configure Helpline URL variables only with your official WhatsApp, X/Twitter, and Etsy destinations. Invalid or unset URLs stay hidden.

### 3. Run in Development

```bash
npm run dev
```

Starts the full-stack Express + Vite server at `http://localhost:3000`.

### 4. Type-Check & Build for Production

```bash
npm run lint
npm run build
```
