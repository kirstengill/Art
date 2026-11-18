import type { OnlineClassProvider } from '../types/onlineClasses';

export interface ParsedOnlineClassVideo {
  provider: OnlineClassProvider;
  videoId: string;
}

export function parseOnlineClassVideoUrl(value: string): ParsedOnlineClassVideo {
  let url: URL;
  try {
    url = new URL(value.trim());
  } catch {
    throw new Error('Enter a valid YouTube or TikTok video URL.');
  }

  if (url.protocol !== 'https:' || url.username || url.password) {
    throw new Error('Video links must use a secure HTTPS URL.');
  }

  const host = url.hostname.toLowerCase();
  if (['youtube.com', 'www.youtube.com', 'm.youtube.com', 'youtu.be'].includes(host)) {
    const candidate =
      host === 'youtu.be'
        ? url.pathname.split('/').filter(Boolean)[0]
        : url.pathname === '/watch'
          ? url.searchParams.get('v')
          : url.pathname.match(/^\/(?:live|embed|shorts)\/([^/]+)\/?$/)?.[1];
    if (!candidate || !/^[A-Za-z0-9_-]{11}$/.test(candidate)) {
      throw new Error('Enter a supported YouTube video or YouTube Live URL.');
    }
    return { provider: 'youtube', videoId: candidate };
  }

  if (['tiktok.com', 'www.tiktok.com', 'm.tiktok.com'].includes(host)) {
    const candidate = url.pathname.match(/^\/@[^/]+\/video\/(\d{10,25})\/?$/)?.[1];
    if (!candidate) {
      throw new Error('Enter a TikTok video URL in the form tiktok.com/@name/video/ID.');
    }
    return { provider: 'tiktok', videoId: candidate };
  }

  throw new Error('Only YouTube and supported TikTok video URLs are accepted.');
}

export function onlineClassEmbedUrl(
  provider: OnlineClassProvider,
  videoId: string
): string {
  if (provider === 'youtube' && /^[A-Za-z0-9_-]{11}$/.test(videoId)) {
    return `https://www.youtube-nocookie.com/embed/${videoId}?rel=0`;
  }
  if (provider === 'tiktok' && /^\d{10,25}$/.test(videoId)) {
    return `https://www.tiktok.com/player/v1/${videoId}`;
  }
  throw new Error('This class has an invalid video identifier.');
}
