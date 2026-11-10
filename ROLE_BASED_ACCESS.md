# Role-Based Access for Louvre Singa

Supabase Auth is the source of user identity and session state. The public signup choices are Artist, Collector, and Art Lover; visitors can use Explore without an account. After sign-in, the application resolves the authenticated user's role from their row in `public.profiles`.

## Roles

- **Artist**: Browse public artwork, publish and manage their own listings, and create community posts.
- **Collector**: Browse artwork, save works, make eligible offers, and create purchase inquiries.
- **Art Lover**: Explore public content and use supported community features without purchasing or uploading artwork.
- **Guest**: Browse Explore and other public pages without registration.
- **Administrator**: Access `/admin` and protected administrative APIs only when the authenticated user's `public.profiles.role` is `admin`.

The client may request an Artist, Collector, or Art Lover role during registration. Existing profile roles remain unchanged by sign-in, profile synchronization, and authenticated profile updates. Admin roles can only be assigned through a trusted database operation; never use client metadata or public registration to grant admin privileges. Dashboard routes verify the Supabase session and database role before rendering.

## Data and Storage authorization

- Supabase Postgres stores profiles, private account details, artwork metadata, community records, collections, inquiries, offers, and order intents.
- Ordinary API database operations use the requester's verified Supabase token and remain subject to Row Level Security.
- Public artwork images are stored in the `artwork-images` Supabase Storage bucket. Uploads accept JPEG, PNG, WebP, or GIF up to 10 MB and require an authenticated Artist profile. Storage paths begin with the authenticated user's ID.
- The bucket allows public reads. Its write policies prevent upload, update, and deletion in another user's folder.
- The server-only Supabase secret is used only for trusted profile synchronization and admin data queries. The admin API verifies the database role using the caller's authenticated Supabase token before accessing admin data. Never expose the secret in browser code.

## Purchase and payout status

Purchase inquiries create order-intent records and remain unpaid. The administrator mediates transaction arrangements using the configured WhatsApp helpline. The intended commission is 20% for Louvre Singa and 80% for the artist, with artist payout only after delivery confirmation. Payment collection, delivery verification, and payouts have not been integrated; no intent is marked as a completed purchase.
