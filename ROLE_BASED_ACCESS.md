# Role-Based Access for Artivora

Supabase Auth is the source of user identity and session state. The public signup choices are Artist, Collector, and Art Lover; visitors can use Explore without an account. Administrator access is not a public role choice and is granted only to user IDs configured in the server-only `ADMIN_UIDS` allowlist.

## Roles

- **Artist**: Browse public artwork, publish and manage their own listings, and create community posts.
- **Collector**: Browse artwork, save works, make eligible offers, and create purchase inquiries.
- **Art Lover**: Explore public content and use supported community features without purchasing or uploading artwork.
- **Guest**: Browse Explore and other public pages without registration.
- **Administrator**: Access protected administrative APIs and analytics only when the authenticated Supabase Auth ID is present in `ADMIN_UIDS`.

The client may request an Artist, Collector, or Art Lover role during registration. Profile role changes made through client-side metadata are not authoritative; the server controls profile synchronization and authenticated users cannot update their `profiles.role` column. Never add an administrator through client metadata or public registration.

## Data and Storage authorization

- Supabase Postgres stores profiles, private account details, artwork metadata, community records, collections, inquiries, offers, and order intents.
- Ordinary API database operations use the requester's verified Supabase token and remain subject to Row Level Security.
- Public artwork images are stored in the `artwork-images` Supabase Storage bucket. Uploads accept JPEG, PNG, WebP, or GIF up to 10 MB and require an authenticated Artist profile. Storage paths begin with the authenticated user's ID.
- The bucket allows public reads. Its write policies prevent upload, update, and deletion in another user's folder.
- The server-only Supabase secret is used only for profile synchronization and admin routes. Never expose it in browser code.

## Purchase and payout status

Purchase inquiries create order-intent records and remain unpaid. The administrator mediates transaction arrangements using the configured WhatsApp helpline. The intended commission is 20% for Artivora and 80% for the artist, with artist payout only after delivery confirmation. Payment collection, delivery verification, and payouts have not been integrated; no intent is marked as a completed purchase.
