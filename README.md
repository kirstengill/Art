# ArtVerse — Contemporary Fine-Art Gallery & Collector Platform

ArtVerse is a digital fine-art gallery and collector community where artists publish original works with transparent acquisition modes, collectors purchase or negotiate artwork-linked offers, and art enthusiasts engage with studio dispatches.

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
  - Includes a Demo Perspective switcher (`Collector` / `Artist`) on sample threads so reviewers can test submitting offers, counteroffers, acceptances, rejections, and withdrawals end-to-end.
- **Artist Studio Dashboard & Add Artwork (`/dashboard`, `/add-artwork`)**: Create, preview, edit, and remove listings with image upload, studio presets, and inline form validation.
- **Authentication (`/login`, `/signup`)**: Supports live Google Sign-In (`Artist`, `Collector`, `Art Lover`) backed by PostgreSQL profile sync, alongside validated local demo role sessions (passwords are never stored in application tables).

## Architecture & Database Setup

1. **Managed PostgreSQL + Express API (`server.ts`, `src/db/schema.ts`, `src/db/repository.ts`)**:
   - Uses Drizzle ORM (`pg` connection pool) across 14 domain tables (`profiles`, `artworks`, `posts`, `comments`, `likes`, `follows`, `collections`, `collection_items`, `conversations`, `conversation_participants`, `messages`, `artwork_offers`, `orders`, `notifications`) plus `users`.
   - Enforces ownership checks on artwork edits/deletions, participant-only access on conversations/messages/offers, and server-side offer state transition & order price validation.
2. **Supabase Client & RLS Portability (`src/lib/supabase.ts`, `supabase/schema.sql`)**:
   - Includes a typed `@supabase/supabase-js` client (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`) and Realtime channel helper, plus complete SQL DDL and Row-Level Security policies in `supabase/schema.sql` for standalone Supabase + Vercel deployments.

## Getting Started

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Copy `.env.example` to `.env` and populate the required placeholders (never commit real secrets):

- `SQL_HOST`, `SQL_DB_NAME`, `SQL_USER`, `SQL_PASSWORD` (PostgreSQL runtime credentials)
- `SQL_ADMIN_USER`, `SQL_ADMIN_PASSWORD` (for Drizzle schema updates)
- `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (optional when connecting to a Supabase project)

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
