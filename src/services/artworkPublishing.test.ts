import assert from 'node:assert/strict';
import test from 'node:test';
import { publishArtworkWithSynchronizedProfile } from './artworkPublishing.ts';

test('synchronizes, uploads the image, then publishes using the storage URL', async () => {
  const calls: string[] = [];
  const artwork = await publishArtworkWithSynchronizedProfile(
    'data:image/png;base64,abc',
    async () => {
      calls.push('sync');
    },
    async () => {
      calls.push('upload');
      return 'https://storage.example.test/artwork.png';
    },
    async (imageKey) => {
      calls.push(`publish:${imageKey}`);
      return { imageKey };
    }
  );

  assert.deepEqual(calls, [
    'sync',
    'upload',
    'publish:https://storage.example.test/artwork.png',
  ]);
  assert.equal(artwork.imageKey, 'https://storage.example.test/artwork.png');
});

test('does not upload or publish if profile synchronization fails', async () => {
  const calls: string[] = [];

  await assert.rejects(
    publishArtworkWithSynchronizedProfile(
      'data:image/png;base64,abc',
      async () => {
        calls.push('sync');
        throw new Error('profile sync failed');
      },
      async () => {
        calls.push('upload');
        return 'https://storage.example.test/artwork.png';
      },
      async () => {
        calls.push('publish');
        return undefined;
      }
    ),
    /profile sync failed/
  );

  assert.deepEqual(calls, ['sync']);
});

test('does not publish an artwork record if image upload fails', async () => {
  const calls: string[] = [];

  await assert.rejects(
    publishArtworkWithSynchronizedProfile(
      'data:image/png;base64,abc',
      async () => {
        calls.push('sync');
      },
      async () => {
        calls.push('upload');
        throw new Error('storage upload failed');
      },
      async () => {
        calls.push('publish');
        return undefined;
      }
    ),
    /storage upload failed/
  );

  assert.deepEqual(calls, ['sync', 'upload']);
});

test('does not re-upload an image already stored by Supabase Storage', async () => {
  const calls: string[] = [];
  const imageUrl = 'https://storage.example.test/existing.png';

  const saved = await publishArtworkWithSynchronizedProfile(
    imageUrl,
    async () => {
      calls.push('sync');
    },
    async () => {
      calls.push('upload');
      return 'unused';
    },
    async (imageKey) => {
      calls.push('publish');
      return imageKey;
    }
  );

  assert.equal(saved, imageUrl);
  assert.deepEqual(calls, ['sync', 'publish']);
});
