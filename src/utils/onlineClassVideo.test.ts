import assert from 'node:assert/strict';
import test from 'node:test';
import { onlineClassEmbedUrl, parseOnlineClassVideoUrl } from './onlineClassVideo.ts';

test('parses supported YouTube, YouTube Live, and TikTok video links', () => {
  assert.deepEqual(
    parseOnlineClassVideoUrl('https://www.youtube.com/watch?v=Abcdef_1234&t=30s'),
    { provider: 'youtube', videoId: 'Abcdef_1234' }
  );
  assert.deepEqual(
    parseOnlineClassVideoUrl('https://youtu.be/Abcdef_1234'),
    { provider: 'youtube', videoId: 'Abcdef_1234' }
  );
  assert.deepEqual(
    parseOnlineClassVideoUrl('https://www.youtube.com/live/Abcdef_1234'),
    { provider: 'youtube', videoId: 'Abcdef_1234' }
  );
  assert.deepEqual(
    parseOnlineClassVideoUrl('https://www.tiktok.com/@artist/video/1234567890123456789'),
    { provider: 'tiktok', videoId: '1234567890123456789' }
  );
});

test('rejects insecure, unsupported, malformed, and unembeddable URL forms', () => {
  for (const url of [
    'http://www.youtube.com/watch?v=Abcdef_1234',
    'https://youtube.com/watch?v=too-short',
    'https://youtube.com.evil.example/watch?v=Abcdef_1234',
    'https://vm.tiktok.com/short-code',
    'https://www.tiktok.com/@artist/live',
    '<iframe src="https://youtube.com"></iframe>',
  ]) {
    assert.throws(() => parseOnlineClassVideoUrl(url), Error, url);
  }
});

test('builds player URLs only from valid provider-specific identifiers', () => {
  assert.equal(
    onlineClassEmbedUrl('youtube', 'Abcdef_1234'),
    'https://www.youtube-nocookie.com/embed/Abcdef_1234?rel=0'
  );
  assert.equal(
    onlineClassEmbedUrl('tiktok', '1234567890123456789'),
    'https://www.tiktok.com/player/v1/1234567890123456789'
  );
  assert.throws(() => onlineClassEmbedUrl('youtube', 'bad-id'));
  assert.throws(() => onlineClassEmbedUrl('tiktok', 'not-numeric'));
});
