import React, { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { ArrowUpRight, Search } from 'lucide-react';
import { useArtVerse } from '../context/ArtVerseContext';
import { ArtworkImage, ProfileAvatar } from '../data/artworkImages';
import { formatMoney } from '../utils/formatters';
import nocturneArtwork from '../assets/images/art_nocturne_study_1792993239582.jpg';

const EASE_OUT: [number, number, number, number] = [0.16, 1, 0.3, 1];

export const ArtistsPage: React.FC = () => {
  const shouldReduceMotion = useReducedMotion();
  const navigate = useNavigate();
  const {
    profiles,
    artworks,
    followedArtistIds,
    toggleFollowArtist,
    currentUser,
  } = useArtVerse();
  const [search, setSearch] = useState('');

  const artists = useMemo(() => {
    const q = search.trim().toLowerCase();
    return profiles
      .filter((p) => p.role === 'artist')
      .filter((p) => {
        if (!q) return true;
        return (
          p.fullName.toLowerCase().includes(q) ||
          p.location.toLowerCase().includes(q) ||
          p.discipline.toLowerCase().includes(q)
        );
      });
  }, [profiles, search]);

  return (
    <div className="w-full relative isolate">
      <div 
        className="absolute inset-0 -z-10"
        style={{
          backgroundImage: `url("${nocturneArtwork}")`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundAttachment: 'fixed',
          opacity: 0.08,
        }}
      />
      <div 
        className="absolute inset-0 -z-10"
        style={{
          background: 'linear-gradient(to bottom, rgba(250, 248, 243, 0.93) 0%, rgba(247, 243, 237, 0.95) 100%)',
        }}
      />
      <div className="max-w-[1360px] mx-auto px-4 sm:px-8 py-8 sm:py-12 lg:py-16">
        <motion.div
          initial={shouldReduceMotion ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, ease: EASE_OUT }}
          className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-10 border-b border-[#E6DFD3]"
        >
          <div className="max-w-2xl">
            <p className="text-xs font-medium tracking-wide text-[#8C6828]">
              Atelier Directory
            </p>
            <h1 className="font-serif text-4xl sm:text-5xl font-semibold text-[#141312] mt-1.5 text-balance">
              Contemporary Artists
            </h1>
            <p className="text-sm sm:text-base text-[#5C554C] mt-3 leading-relaxed">
              Discover studio practices across painting, carved stone sculpture, darkroom
              photography, and archival works on paper.
            </p>
          </div>

          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 text-[#7A7267] absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search artists by name, city, or medium"
              placeholder="Search name, city, or medium..."
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-[#D8D0C1] rounded-xl text-sm text-[#141312] placeholder:text-[#9A9184] focus:outline-none focus:border-[#B38B40] transition-colors"
            />
          </div>
        </motion.div>

        {artists.length === 0 ? (
          <div className="mt-10 p-12 bg-white border border-[#E6DFD3] rounded-2xl text-center space-y-3">
            <h2 className="font-serif text-2xl font-semibold text-[#141312]">
              {profiles.some((profile) => profile.role === 'artist')
                ? 'No matching ateliers found'
                : 'No artist profiles yet'}
            </h2>
            <p className="text-sm text-[#5C554C]">
              {profiles.some((profile) => profile.role === 'artist')
                ? 'Try clearing your search filter to view all studio artists.'
                : 'Artist profiles will appear here as artists join ARTIVORA.'}
            </p>
            {profiles.some((profile) => profile.role === 'artist') ? (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="px-4 py-2 text-xs font-medium bg-[#141312] text-[#FAF8F3] rounded-lg hover:bg-[#2A2724] transition-colors"
              >
                Reset Search
              </button>
            ) : (
              <Link
                to="/signup"
                className="inline-flex px-4 py-2 text-xs font-medium bg-[#141312] text-[#FAF8F3] rounded-lg hover:bg-[#2A2724] transition-colors"
              >
                Join as an Artist
              </Link>
            )}
          </div>
        ) : (
          <motion.div
            layout
            className="grid grid-cols-1 lg:grid-cols-2 gap-8 pt-10"
          >
            <AnimatePresence mode="popLayout">
              {artists.map((artist, idx) => {
                const artistWorks = artworks.filter((a) => a.artistId === artist.id);
                const isFollowing = followedArtistIds.includes(artist.id);
                const primaryWork = artistWorks[0];

                return (
                  <motion.article
                    key={artist.id}
                    layout
                    initial={
                      shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 16 }
                    }
                    animate={{ opacity: 1, y: 0 }}
                    exit={
                      shouldReduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.97 }
                    }
                    whileHover={shouldReduceMotion ? undefined : { y: -3 }}
                    transition={{
                      duration: 0.24,
                      delay: Math.min(idx * 0.05, 0.2),
                      ease: EASE_OUT,
                    }}
                    className="bg-white border border-[#E6DFD3] hover:border-[#D0C3AA] rounded-2xl overflow-hidden flex flex-col justify-between transition-colors shadow-2xs"
                  >
                    <div className="p-6 sm:p-8 space-y-5">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-center gap-4 min-w-0">
                          <ProfileAvatar
                            name={artist.fullName}
                            avatarKey={artist.avatarUrl}
                            sizeClass="w-14 h-14 text-lg"
                          />
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 text-xs text-[#7A7267]">
                              <span className="truncate">{artist.location}</span>
                            </div>
                            <h2 className="font-serif text-2xl sm:text-[26px] font-semibold text-[#141312] truncate">
                              <Link
                                to={`/artists/${artist.id}`}
                                className="hover:text-[#B38B40] transition-colors"
                              >
                                {artist.fullName}
                              </Link>
                            </h2>
                            <p className="text-xs text-[#6B655E] truncate">
                              {artist.discipline}
                            </p>
                          </div>
                        </div>

                        <motion.button
                          type="button"
                          whileTap={shouldReduceMotion ? undefined : { scale: 0.95 }}
                          onClick={() => {
                            if (!currentUser) {
                              navigate('/login', {
                                state: { from: { pathname: `/artists/${artist.id}` } },
                              });
                              return;
                            }
                            void toggleFollowArtist(artist.id);
                          }}
                          className={`px-4 py-2 text-xs font-medium rounded-xl transition-colors whitespace-nowrap shrink-0 ${
                            isFollowing
                              ? 'bg-[#141312] text-[#FAF8F3]'
                              : 'bg-[#F3EFE6] text-[#141312] hover:bg-[#E7E0D2]'
                          }`}
                        >
                          {isFollowing ? 'Following' : 'Follow'}
                        </motion.button>
                      </div>

                      <p className="text-sm text-[#5C554C] leading-relaxed">
                        {artist.bio}
                      </p>

                      {primaryWork && (
                        <Link
                          to={`/artwork/${primaryWork.id}`}
                          className="group flex items-center gap-4 p-3 rounded-xl bg-[#FAF8F3] border border-[#ECE6DA] hover:border-[#CBBFA8] transition-colors"
                        >
                          <div className="w-16 h-16 rounded-lg overflow-hidden shrink-0">
                            <ArtworkImage
                              imageKey={primaryWork.imageKey}
                              alt={primaryWork.title}
                              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                            />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs text-[#7A7267]">Representative Work</p>
                            <p className="font-serif text-lg font-semibold text-[#141312] group-hover:text-[#B38B40] transition-colors truncate">
                              {primaryWork.title}
                            </p>
                            <p className="font-mono text-xs text-[#5C554C] tabular-nums">
                              {formatMoney(primaryWork.price, primaryWork.currency)}{' '}
                              {primaryWork.currency}
                            </p>
                          </div>
                          <ArrowUpRight className="w-4 h-4 text-[#8C6828] opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all shrink-0 mr-1" />
                        </Link>
                      )}
                    </div>

                    <div className="px-5 sm:px-8 py-4 bg-[#FAF8F3] border-t border-[#ECE6DA] flex flex-wrap items-center justify-between gap-2 text-xs">
                      <span className="text-[#6B655E] tabular-nums">
                        {artistWorks.length} available or archived catalogue{' '}
                        {artistWorks.length === 1 ? 'work' : 'works'}
                      </span>
                      <Link
                        to={`/artists/${artist.id}`}
                        className="font-medium text-[#8C6828] hover:text-[#141312] transition-colors whitespace-nowrap"
                      >
                        Enter Artist Viewing Room →
                      </Link>
                    </div>
                  </motion.article>
                );
              })}
            </AnimatePresence>
          </motion.div>
        )}
      </div>
    </div>
  );
};
