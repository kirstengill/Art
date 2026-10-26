import React, { useState } from 'react';
import { Frame } from 'lucide-react';
import heroGildedHorizon from '../assets/images/hero_gilded_horizon_1792993235968.jpg';
import artMarbleForm from '../assets/images/art_marble_form_1792993238374.jpg';
import artNocturneStudy from '../assets/images/art_nocturne_study_1792993239582.jpg';
import artTerracottaStudy from '../assets/images/art_terracotta_study_1792993240609.jpg';
import artLapisRefraction from '../assets/images/art_lapis_refraction_1792993241626.jpg';
import atelierEditorialCover from '../assets/images/atelier_editorial_cover_1792993242654.jpg';

export const STUDIO_IMAGE_MAP: Record<string, string> = {
  hero_gilded_horizon: heroGildedHorizon,
  art_marble_form: artMarbleForm,
  art_nocturne_study: artNocturneStudy,
  art_terracotta_study: artTerracottaStudy,
  art_lapis_refraction: artLapisRefraction,
  atelier_editorial_cover: atelierEditorialCover,
};

export const STUDIO_PRESET_OPTIONS = [
  { key: 'hero_gilded_horizon', label: 'Impasto & Gold Leaf on Linen' },
  { key: 'art_marble_form', label: 'Carved Carrara Marble Monolith' },
  { key: 'art_nocturne_study', label: 'Silver Gelatin Venetian Study' },
  { key: 'art_terracotta_study', label: 'Charcoal & Terracotta Rag Study' },
  { key: 'art_lapis_refraction', label: 'Lapis Geometric Etching Edition' },
  { key: 'atelier_editorial_cover', label: 'North-Lit Atelier Oil Study' },
];

export function resolveArtworkImageUrl(imageKey?: string | null): string | null {
  if (!imageKey) return null;
  if (STUDIO_IMAGE_MAP[imageKey]) {
    return STUDIO_IMAGE_MAP[imageKey];
  }
  if (
    imageKey.startsWith('data:image/') ||
    imageKey.startsWith('http://') ||
    imageKey.startsWith('https://') ||
    imageKey.startsWith('/')
  ) {
    return imageKey;
  }
  return null;
}

interface ArtworkImageProps {
  imageKey?: string | null;
  alt: string;
  className?: string;
}

export const ArtworkImage: React.FC<ArtworkImageProps> = ({
  imageKey,
  alt,
  className = 'w-full h-full object-cover',
}) => {
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const resolved = resolveArtworkImageUrl(imageKey);

  if (!resolved || failed) {
    return (
      <div className="w-full h-full min-h-[160px] bg-gradient-to-br from-[#F4F0E8] via-[#EBE5D8] to-[#DFD7C5] flex flex-col items-center justify-center p-6 text-center text-[#5C554C]">
        <Frame className="w-7 h-7 text-[#9E7B3B] mb-2 stroke-[1.25]" />
        <span className="font-serif italic text-sm line-clamp-2 max-w-[200px]">
          {alt}
        </span>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full overflow-hidden bg-[#F2EDE4]">
      {!loaded && (
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-[#EDE7DC] animate-pulse"
        />
      )}
      <img
        src={resolved}
        alt={alt}
        referrerPolicy="no-referrer"
        onLoad={() => setLoaded(true)}
        onError={() => setFailed(true)}
        className={`${className} transition-opacity duration-300 ${
          loaded ? 'opacity-100' : 'opacity-0'
        }`}
      />
    </div>
  );
};

interface ProfileAvatarProps {
  name: string;
  avatarKey?: string | null;
  sizeClass?: string;
}

export const ProfileAvatar: React.FC<ProfileAvatarProps> = ({
  name,
  avatarKey,
  sizeClass = 'w-10 h-10 text-sm',
}) => {
  const [failed, setFailed] = useState(false);
  const resolved = resolveArtworkImageUrl(avatarKey);
  const initials = name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');

  if (resolved && !failed) {
    return (
      <img
        src={resolved}
        alt={name}
        referrerPolicy="no-referrer"
        onError={() => setFailed(true)}
        className={`${sizeClass} rounded-full object-cover border border-[#E5DFD5] shrink-0`}
      />
    );
  }

  return (
    <div
      aria-label={name}
      className={`${sizeClass} rounded-full bg-[#24211E] text-[#FBF9F5] font-serif font-medium flex items-center justify-center shrink-0 border border-[#3B352F]`}
    >
      {initials || 'AV'}
    </div>
  );
};
