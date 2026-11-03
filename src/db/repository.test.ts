import assert from 'node:assert/strict';
import test from 'node:test';
import { filterVisibleCatalogRows } from './repository.ts';

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
