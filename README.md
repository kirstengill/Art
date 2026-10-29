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

- **Supabase is the single persistent backend**: Supabase Postgres stores profiles, private account details, artwork, community activity, saved collections, inquiries/offers, and purchase intents. The Express API uses the official Supabase client and the caller's verified Supabase access token so ordinary requests remain subject to RLS.
- **Authentication**: Supabase Auth is the only account/session provider. Email/password registration and sign-in use the existing Supabase Auth flow; explore remains available without signing in. Public signup accepts Artist, Collector, or Art Lover. Admin access is granted only by the server-side `ADMIN_UIDS` allowlist, never by client metadata or profile updates.
- **Artwork storage**: Images go to the existing public `artwork-images` bucket. Uploads are restricted to authenticated artist accounts and a folder named for their Auth user ID; MIME types are JPEG, PNG, WebP, or GIF, up to 10 MB. Artwork metadata references the public Storage URL.
- **Administrator dashboard**: `/api/admin/*` checks the authenticated user ID against `ADMIN_UIDS` before using the server-only Supabase secret. Configure `SUPABASE_SECRET_KEY` only in the trusted server/deployment environment. Never prefix it with `VITE_`.
- **Transactions**: A purchase intent is not a payment. Artivora's intended split is 20% platform / 80% artist, with artist payout only after delivery confirmation, but no payment collection, escrow, delivery verification, or payout integration exists. The admin must mediate inquiries manually; no legal compliance or settlement is asserted. The UI does not allow users to mark an unpaid intent as a completed purchase.
- **Schema**: Existing tables and policies in `supabase/migrations/` remain the foundation. The new security migration adds only missing demo fields and tightens profile, artwork, order, and Storage authorization. The old `public.users` mirror table is no longer used; if present from an earlier migration, it is retained rather than dropped to avoid data loss.

## Getting Started

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Copy `.env.example` to `.env` and populate the required placeholders (never commit real secrets):

- `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (required by the browser; use only the Supabase publishable/anon key)
- `SUPABASE_URL`, `SUPABASE_ANON_KEY` (server equivalents; may be omitted when the `VITE_` equivalents are present)
- `SUPABASE_SECRET_KEY` (required for trusted profile synchronization and admin queries; server only; a legacy `SUPABASE_SERVICE_ROLE_KEY` is also accepted)
- `ADMIN_UIDS` (server-only comma-separated Supabase Auth user IDs for administrator access; do not use a `VITE_` prefix)
- `VITE_HELPLINE_WHATSAPP_URL`, `VITE_HELPLINE_X_URL`, `VITE_HELPLINE_ETSY_URL` (optional official HTTPS destinations for the footer icons)

`GEMINI_API_KEY` and `APP_URL` remain available for the existing AI/hosting integrations. No separately hosted PostgreSQL instance or database login credentials are required.

### Supabase Auth Setup

1. Enable email/password authentication in the Supabase dashboard. Configure email confirmation according to your deployment policy.
2. Add each app callback URL to Supabase Auth's allowed redirect URLs, including `http://localhost:3000/auth/callback` for local development and the corresponding URL for each deployed origin.
3. Add administrator Supabase Auth user UUIDs to the server-only `ADMIN_UIDS` variable. Never use mutable role metadata to grant administrator access; public registration cannot create Admin accounts.
4. Link the Supabase CLI to project `majessboafhzsbardtmb` and review/apply pending migrations with `npx supabase db push`. Do not re-run the full `supabase/schema.sql` snapshot against an existing project.
5. Configure Helpline URL variables only with your official WhatsApp, X/Twitter, and Etsy destinations. Invalid or unset URLs stay hidden.

The app's profile sync and admin routes require a server-only Supabase secret key. Missing credentials prevent those routes from succeeding; local build/tests do not verify a live Supabase project.

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
