import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createPurchaseRequestInDb,
  filterVisibleCatalogRows,
  removeAdminArtworkListing,
  upsertArtworkListing,
} from './repository.ts';
import type { SupabaseDataClient } from '../lib/supabase-server.ts';
import { PurchaseWorkflowError } from '../utils/purchaseRequests.ts';

function artworkDeletionClient(
  operations: string[],
  options: { imageKey?: string | null; imageError?: string; hasPurchase?: boolean } = {}
): SupabaseDataClient {
  const lookup = {
    eq: () => lookup,
    maybeSingle: async () => ({
      data: options.imageKey === null
        ? null
        : { image_key: options.imageKey ?? 'https://storage.example/storage/v1/object/public/artwork-images/artist-1/image.jpg' },
      error: null,
    }),
  };
  const deletion = {
    eq: () => deletion,
    select: () => deletion,
    maybeSingle: async () => {
      operations.push('delete artwork');
      return { data: { id: 'artwork-1' }, error: null };
    },
  };
  const purchaseLookup = {
    eq: () => purchaseLookup,
    maybeSingle: async () => {
      operations.push('check purchase');
      return {
        data: options.hasPurchase ? { id: 'purchase-1' } : null,
        error: null,
      };
    },
  };
  return {
    from: (table: string) => {
      if (table === 'purchases') {
        return { select: () => purchaseLookup };
      }
      assert.equal(table, 'artworks');
      return {
        select: () => lookup,
        delete: () => deletion,
      };
    },
    storage: {
      from: (bucket: string) => ({
        remove: async (paths: string[]) => {
          assert.equal(bucket, 'artwork-images');
          operations.push(`remove image ${paths[0]}`);
          return {
            data: null,
            error: options.imageError ? { message: options.imageError } : null,
          };
        },
      }),
    },
  } as unknown as SupabaseDataClient;
}

test('keeps public catalog rows linked to visible profiles after database key conversion', () => {
  const {
    visibleProfiles,
    visibleArtworks,
    visiblePosts,
    visibleComments,
  } = filterVisibleCatalogRows(
    [
      { id: 'artist-1', isDemo: false },
      { id: 'demo-artist', isDemo: true },
    ],
    [
      { id: 'artwork-1', artistId: 'artist-1', isDemo: false },
      { id: 'demo-artwork', artistId: 'artist-1', isDemo: true },
      { id: 'hidden-artwork', artistId: 'demo-artist', isDemo: false },
    ],
    [
      { id: 'post-1', authorId: 'artist-1', isDemo: false },
      { id: 'demo-post', authorId: 'artist-1', isDemo: true },
      { id: 'hidden-post', authorId: 'demo-artist', isDemo: false },
    ],
    [
      { id: 'comment-1', postId: 'post-1', authorId: 'artist-1' },
      { id: 'hidden-comment-author', postId: 'post-1', authorId: 'demo-artist' },
      { id: 'hidden-comment-post', postId: 'hidden-post', authorId: 'artist-1' },
    ]
  );

  assert.deepEqual(visibleProfiles.map(({ id }) => id), ['artist-1']);
  assert.deepEqual(visibleArtworks.map(({ id }) => id), ['artwork-1']);
  assert.deepEqual(visiblePosts.map(({ id }) => id), ['post-1']);
  assert.deepEqual(visibleComments.map(({ id }) => id), ['comment-1']);
});

test('admin artwork deletion removes its stored image before deleting the database row', async () => {
  const operations: string[] = [];

  const result = await removeAdminArtworkListing(
    artworkDeletionClient(operations),
    'artwork-1'
  );

  assert.deepEqual(result, { deletedId: 'artwork-1' });
  assert.deepEqual(operations, [
    'check purchase',
    'remove image artist-1/image.jpg',
    'delete artwork',
  ]);
});

test('admin artwork deletion leaves the database row when image removal fails', async () => {
  const operations: string[] = [];

  await assert.rejects(
    removeAdminArtworkListing(
      artworkDeletionClient(operations, { imageError: 'Storage unavailable' }),
      'artwork-1'
    ),
    /Unable to remove artwork image/
  );
  assert.deepEqual(operations, ['check purchase', 'remove image artist-1/image.jpg']);
});

test('admin artwork deletion does not delete anything when the artwork is missing', async () => {
  const operations: string[] = [];

  await assert.rejects(
    removeAdminArtworkListing(
      artworkDeletionClient(operations, { imageKey: null }),
      'artwork-1'
    ),
    /Artwork not found/
  );
  assert.deepEqual(operations, []);
});

test('preserves artwork and image when an approved purchase exists', async () => {
  const operations: string[] = [];

  await assert.rejects(
    removeAdminArtworkListing(
      artworkDeletionClient(operations, { hasPurchase: true }),
      'artwork-1'
    ),
    /approved purchase and cannot be permanently deleted/
  );
  assert.deepEqual(operations, ['check purchase']);
});

test('artist publishing always saves available fixed-price listings', async () => {
  let insertedArtwork: Record<string, unknown> | undefined;
  const db = {
    from: (table: string) => {
      if (table === 'profiles') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({ data: { role: 'artist' }, error: null }),
            }),
          }),
        };
      }
      assert.equal(table, 'artworks');
      return {
        insert: (values: Record<string, unknown>) => {
          insertedArtwork = values;
          return {
            select: () => ({
              single: async () => ({ data: values, error: null }),
            }),
          };
        },
      };
    },
  } as unknown as SupabaseDataClient;

  await upsertArtworkListing(db, 'artist-1', {
    title: 'Clay Vessel',
    description: 'A detailed account of this ceramic artwork and its process.',
    category: 'other',
    medium: '',
    dimensions: '',
    year: 2026,
    price: 250,
    currency: 'USD',
    availability: 'sold',
    saleMode: 'negotiation_only',
    imageKey: 'artist-1/artwork.jpg',
  });

  assert.equal(insertedArtwork?.availability, 'available');
  assert.equal(insertedArtwork?.sale_mode, 'buy_now');
  assert.equal(insertedArtwork?.category, 'other');
});

test('purchase requests are created through the authenticated transactional RPC', async () => {
  let calledFunction = '';
  let receivedArgs: Record<string, unknown> | undefined;
  const db = {
    rpc: async (name: string, args: Record<string, unknown>) => {
      calledFunction = name;
      receivedArgs = args;
      return {
        data: {
          id: 'pr-1',
          status: 'pending',
          amount: 450,
          currency: 'USD',
          created_at: '2026-11-12T10:00:00.000Z',
        },
        error: null,
      };
    },
  } as unknown as SupabaseDataClient;

  const receipt = await createPurchaseRequestInDb(db, {
    requestId: '01234567-89ab-cdef-0123-456789abcdef',
    artworkId: 'artwork-1',
    buyerName: 'Collector One',
    buyerPhone: '+1 555 123 4567',
    buyerEmail: 'collector@example.com',
    deliveryLocation: 'London',
    deliveryAddress: '10 Gallery Road',
    instructions: '',
  });

  assert.equal(calledFunction, 'submit_purchase_request');
  assert.equal(receivedArgs?.p_artwork_id, 'artwork-1');
  assert.equal(receivedArgs?.p_buyer_name, 'Collector One');
  assert.deepEqual(receipt, {
    id: 'pr-1',
    status: 'pending',
    amount: 450,
    currency: 'USD',
    createdAt: '2026-11-12T10:00:00.000Z',
  });
});

test('purchase request submission propagates collector authorization failures', async () => {
  const db = {
    rpc: async () => ({
      data: null,
      error: { code: '42501', message: 'An approved collector account is required.' },
    }),
  } as unknown as SupabaseDataClient;

  await assert.rejects(
    createPurchaseRequestInDb(db, {
      requestId: '01234567-89ab-cdef-0123-456789abcdef',
      artworkId: 'artwork-1',
      buyerName: 'Collector One',
      buyerPhone: '+1 555 123 4567',
      buyerEmail: '',
      deliveryLocation: 'London',
      deliveryAddress: '10 Gallery Road',
      instructions: '',
    }),
    (error: unknown) =>
      error instanceof PurchaseWorkflowError && error.statusCode === 403
  );
});

test('editing a sold artwork keeps it unavailable while fixing its sale mode', async () => {
  let updatedArtwork: Record<string, unknown> | undefined;
  const db = {
    from: (table: string) => {
      if (table === 'profiles') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({ data: { role: 'artist' }, error: null }),
            }),
          }),
        };
      }
      assert.equal(table, 'artworks');
      return {
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({
              data: {
                id: 'artwork-1',
                artist_id: 'artist-1',
                availability: 'sold',
                provenance: 'Existing provenance',
                edition_info: 'Existing edition',
              },
              error: null,
            }),
          }),
        }),
        update: (values: Record<string, unknown>) => {
          updatedArtwork = values;
          return {
            eq: () => ({
              eq: () => ({
                select: () => ({
                  single: async () => ({ data: values, error: null }),
                }),
              }),
            }),
          };
        },
      };
    },
  } as unknown as SupabaseDataClient;

  await upsertArtworkListing(db, 'artist-1', {
    id: 'artwork-1',
    title: 'Clay Vessel',
    description: 'A detailed account of this ceramic artwork and its process.',
    category: 'painting',
    medium: '',
    dimensions: '',
    year: 2026,
    price: 250,
    currency: 'USD',
    availability: 'available',
    saleMode: 'buy_now',
    imageKey: 'artist-1/artwork.jpg',
  });

  assert.equal(updatedArtwork?.availability, 'sold');
  assert.equal(updatedArtwork?.sale_mode, 'buy_now');
});

test('artist publishing rejects missing categories and invalid prices on the backend', async () => {
  const db = {
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({ data: { role: 'artist' }, error: null }),
        }),
      }),
    }),
  } as unknown as SupabaseDataClient;
  const payload = {
    title: 'Clay Vessel',
    description: 'A detailed account of this ceramic artwork and its process.',
    category: 'painting',
    medium: '',
    dimensions: '',
    year: 2026,
    price: 250,
    currency: 'USD',
    availability: 'available',
    saleMode: 'buy_now',
    imageKey: 'artist-1/artwork.jpg',
  };

  await assert.rejects(
    upsertArtworkListing(db, 'artist-1', { ...payload, category: '' }),
    /Invalid artwork category/
  );
  await assert.rejects(
    upsertArtworkListing(db, 'artist-1', { ...payload, price: 0 }),
    /valid listing price/
  );
});
