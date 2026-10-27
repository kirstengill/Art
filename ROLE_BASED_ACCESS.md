# Role-Based Access Control for Art Universe

This document describes the implementation of role-based accounts for Art Universe with three user types: **Artist**, **Collector**, and **Art Lover (Explore)**.

## User Roles & Permissions

### 1. Art Lover (Explore)
- **Permissions:**
  - ✅ Browse and view all publicly posted artwork
  - ✅ Follow artists
  - ✅ Save artwork to personal collection
  - ❌ **CANNOT** purchase artwork
  - ❌ **CANNOT** upload artwork
  - ❌ **CANNOT** create community posts
  - ❌ **CANNOT** make offers

- **Behavior:**
  - When Art Lovers click "Buy" or "Purchase" buttons, they see a prompt to create a Collector account
  - All artwork remains visible regardless of account type
  - Can explore the full gallery and artist directory

### 2. Collector
- **Permissions:**
  - ✅ Browse and view all publicly posted artwork
  - ✅ Purchase available artwork
  - ✅ Make offers on negotiable artwork
  - ✅ Maintain personal collection gallery (purchased artworks)
  - ✅ Follow artists
  - ✅ Save artwork to personal collection
  - ❌ **CANNOT** upload artwork
  - ❌ **CANNOT** create community posts

- **Features:**
  - "My Collection" page (`/collection`) displays all purchased artworks
  - Purchase tracking with ownership records
  - Complete purchase flow with order intent creation

### 3. Artist
- **Permissions:**
  - ✅ Create profiles
  - ✅ Upload and manage their artwork
  - ✅ Offer artwork for public viewing or sale
  - ✅ Set sale modes (Buy Now, Negotiation Only, or Both)
  - ✅ Create community posts
  - ✅ Receive messages and offers from collectors
  - ✅ Manage own artwork listings
  - ❌ **CANNOT** purchase artwork (unless they also have a Collector account)

- **Features:**
  - "My Studio" dashboard (`/dashboard`)
  - Artwork management (create, edit, delete)
  - Post creation for community engagement

## Database Schema Changes

### New Tables

#### `purchases` Table
Tracks which collectors have purchased which artworks:
```sql
CREATE TABLE IF NOT EXISTS public.purchases (
  id text PRIMARY KEY,
  artwork_id text NOT NULL REFERENCES public.artworks(id) ON DELETE CASCADE,
  collector_id text NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  order_id text NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  purchase_price integer NOT NULL CHECK (purchase_price > 0),
  currency text NOT NULL DEFAULT 'USD',
  purchased_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (artwork_id, collector_id)
);
```

### Updated Tables

#### `orders` Table
Added `completed` status to track finished purchases:
```sql
status text NOT NULL DEFAULT 'intent_created' 
  CHECK (status IN ('intent_created', 'awaiting_payment', 'cancelled', 'completed'))
```

## RLS Policies

### Purchase Policies
```sql
-- Collectors can view their own purchases
CREATE POLICY "Collectors can view their own purchases"
  ON public.purchases FOR SELECT
  USING (auth.uid()::text = collector_id);

-- Users can view orders they are part of (as buyer or seller)
CREATE POLICY "Users can view orders they are part of"
  ON public.orders FOR SELECT
  USING (auth.uid()::text = buyer_id OR auth.uid()::text = seller_id);
```

## API Endpoints

### New Purchase Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/purchases/complete` | Complete a purchase and record ownership | ✅ |
| GET | `/api/purchases` | Get all purchases for current user | ✅ |
| GET | `/api/purchases/check/:artworkId` | Check if user has purchased specific artwork | ✅ |
| GET | `/api/purchases/artwork-ids` | Get list of purchased artwork IDs | ✅ |

### Request/Response Examples

#### Complete Purchase
```typescript
POST /api/purchases/complete
Headers: { Authorization: 'Bearer <token>' }
Body: {
  orderId: string,
  artworkId: string,
  amount: number,
  currency: string
}
Response: { order: OrderIntent, purchase: Purchase }
```

#### Get Purchases
```typescript
GET /api/purchases
Headers: { Authorization: 'Bearer <token>' }
Response: { purchases: Purchase[], artworks: Artwork[] }
```

## Frontend Components

### New Components

1. **CollectedGalleryPage** (`/collection`)
   - Displays all artworks purchased by the collector
   - Shows total amount spent
   - Responsive grid layout
   - Only accessible to Collector role

### Updated Components

1. **ArtworkCard**
   - Role-based purchase button visibility
   - Upgrade prompt modal for Art Lovers
   - Disabled purchase button for Art Lovers (with upgrade option)

2. **ArtworkDetailPage**
   - Role-based action buttons
   - "Become a Collector" button for Art Lovers
   - Updated purchase and offer permissions

3. **PurchaseIntentModal**
   - Added `onCompletePurchase` callback
   - "Complete Purchase" button after intent creation
   - Full purchase flow for Collectors

4. **Navbar**
   - "My Collection" link for Collectors
   - Role-specific navigation

5. **ArtVerseContext**
   - Added `purchases` and `purchasedArtworkIds` state
   - Added `refreshPurchases()` function
   - Added `completePurchase()` function
   - Added `getIsPurchased()` helper

## Type Definitions

### New Types (in `src/types/artverse.ts`)

```typescript
export interface Purchase {
  id: string;
  artworkId: string;
  collectorId: string;
  orderId: string;
  purchasePrice: number;
  currency: string;
  purchasedAt: string;
}

export const ROLE_PERMISSIONS: Record<UserRole, {
  canBrowse: boolean;
  canPurchase: boolean;
  canUploadArtwork: boolean;
  canCreatePosts: boolean;
  canMakeOffers: boolean;
  canViewCollection: boolean;
}> = {
  artist: {
    canBrowse: true,
    canPurchase: false,
    canUploadArtwork: true,
    canCreatePosts: true,
    canMakeOffers: false,
    canViewCollection: true,
  },
  collector: {
    canBrowse: true,
    canPurchase: true,
    canUploadArtwork: false,
    canCreatePosts: false,
    canMakeOffers: true,
    canViewCollection: true,
  },
  art_lover: {
    canBrowse: true,
    canPurchase: false,
    canUploadArtwork: false,
    canCreatePosts: false,
    canMakeOffers: false,
    canViewCollection: false,
  },
};
```

## Routing & Navigation

### Protected Routes

| Route | Accessible To | Component |
|-------|--------------|-----------|
| `/` | All users | LandingPage |
| `/gallery` | All users | GalleryPage |
| `/artwork/:id` | All users | ArtworkDetailPage |
| `/artists` | All users | ArtistsPage |
| `/artists/:id` | All users | ArtistProfilePage |
| `/community` | All users | CommunityPage |
| `/messages` | Authenticated users | MessagesPage |
| `/dashboard` | Artists, Collectors | DashboardPage |
| `/add-artwork` | Artists only | AddArtworkPage |
| `/collection` | Collectors only | CollectedGalleryPage |
| `/admin` | Admins only | AdminPage |

### Role-Based Navigation

**Art Lovers:**
- Can navigate to: Home, Gallery, Artists, Community
- Cannot access: Dashboard, Add Artwork, Collection

**Collectors:**
- Can navigate to: Home, Gallery, Artists, Community, Messages, Dashboard, Collection
- Cannot access: Add Artwork

**Artists:**
- Can navigate to: Home, Gallery, Artists, Community, Messages, Dashboard, Add Artwork
- Cannot access: Collection (unless they also have Collector role)

## User Experience Flow

### Art Lover Trying to Purchase
1. Art Lover views artwork
2. Clicks "Buy Artwork" button
3. Modal appears: "Create a Collector Account"
4. Options:
   - "Become a Collector" - redirects to signup with role=collector
   - "Continue Browsing" - closes modal

### Collector Purchasing Artwork
1. Collector views artwork
2. Clicks "Buy Artwork"
3. PurchaseIntentModal opens
4. Fills shipping and note information
5. Clicks "Register Purchase Intent"
6. Intent is created (status: awaiting_payment)
7. Collector sees "Complete Purchase" button
8. Clicks "Complete Purchase"
9. Order status changes to "completed"
10. Purchase record created in `purchases` table
11. Artwork status changes to "sold"
12. Collector can view purchased artwork in "My Collection"

### Artist Uploading Artwork
1. Artist logs in
2. Navigates to Dashboard
3. Clicks "Add Artwork"
4. Fills artwork details
5. Uploads image to Supabase Storage
6. Artwork is published and visible to all users

## Setup Instructions

### 1. Apply Database Schema
Run the updated `supabase/schema.sql` in your Supabase SQL Editor:
```bash
# Execute the SQL in Supabase Dashboard
# Or use: psql -h your-host -U postgres -d your-db < supabase/schema.sql
```

### 2. Apply Drizzle Schema
```bash
npx drizzle-kit push --config=src/db/drizzle.config.ts
```

### 3. Configure Environment
Ensure all required environment variables are set in `.env`:
```bash
# Supabase
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# Database
SQL_HOST=your-host
SQL_DB_NAME=your-db
SQL_USER=your-user
SQL_PASSWORD=your-password
SQL_ADMIN_USER=admin-user
SQL_ADMIN_PASSWORD=admin-password

# Admin (comma-separated UUIDs)
ADMIN_UIDS=uuid1,uuid2
```

### 4. Restart Application
```bash
npm run dev
```

## Testing the Implementation

### Test Cases

1. **Art Lover Browsing**
   - Sign up as art_lover
   - Verify can browse gallery
   - Verify "Buy Artwork" button shows upgrade prompt
   - Verify cannot access /dashboard or /add-artwork

2. **Collector Purchasing**
   - Sign up as collector
   - Browse gallery and find artwork
   - Click "Buy Artwork"
   - Complete purchase flow
   - Verify artwork appears in /collection

3. **Artist Uploading**
   - Sign up as artist
   - Navigate to /add-artwork
   - Create new artwork
   - Verify artwork appears in gallery for all users

4. **Role Switching**
   - Log out and sign up with different roles
   - Verify navigation and feature availability changes accordingly

## Notes

- All artwork is **publicly visible** regardless of user role or authentication status
- **Art Lovers cannot purchase** but can browse everything
- **Collectors can purchase** and maintain collection galleries
- **Artists can upload** and manage their artwork
- Payment processing is **not yet integrated** - purchases create intent records
- Upgrade prompts guide Art Lovers to become Collectors when attempting to purchase
