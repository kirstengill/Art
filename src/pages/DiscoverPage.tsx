import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  AnimatePresence,
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
} from 'motion/react';
import { ArrowRight, ArrowUpRight, ChevronLeft, ChevronRight } from 'lucide-react';
import { useArtVerse } from '../context/ArtVerseContext';
import { ArtworkImage, ProfileAvatar } from '../data/artworkImages';
import { ArtworkCard } from '../components/artwork/ArtworkCard';
import { ArtworkGridSkeleton } from '../components/ui/Skeletons';
import {
  formatCategoryLabel,
  formatMoney,
  formatSaleModeLabel,
  formatShortDate,
} from '../utils/formatters';
import heroArtwork from '../assets/images/hero_gilded_horizon_1792993235968.jpg';

export const DiscoverPage: React.FC = () => {
  const shouldReduceMotion = useReducedMotion();
  const {
    artworks,
    profiles,
    posts,
    followedArtistIds,
    isLoadingCatalog,
    toggleFollowArtist,
  } = useArtVerse();

  const featuredWorks = artworks.filter((a) => a.featured).slice(0, 4);
  const heroPool = featuredWorks.length > 0 ? featuredWorks : artworks.slice(0, 3);
  const [heroIndex, setHeroIndex] = useState(0);
  const [heroPaused, setHeroPaused] = useState(false);

  useEffect(() => {
    if (shouldReduceMotion || heroPaused || heroPool.length <= 1) return;
    const timer = window.setInterval(() => {
      setHeroIndex((prev) => (prev + 1) % heroPool.length);
    }, 6500);
    return () => window.clearInterval(timer);
  }, [heroPaused, heroPool.length, shouldReduceMotion]);

  const safeIndex = heroPool.length > 0 ? heroIndex % heroPool.length : 0;
  const heroWork = heroPool[safeIndex] || artworks[0];
  const heroArtist = heroWork
    ? profiles.find((p) => p.id === heroWork.artistId)
    : undefined;

  const { scrollY } = useScroll();
  const heroImageParallax = useTransform(scrollY, [0, 500], [0, 28]);

  const artists = profiles.filter((p) => p.role === 'artist').slice(0, 4);
  const recentPosts = posts.slice(0, 3);

  return (
    <div className="w-full relative isolate">
      <div 
        className="absolute inset-0 -z-10"
        style={{
          backgroundImage: `url("${heroArtwork}")`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundAttachment: 'fixed',
          opacity: 0.08,
        }}
      />
      <div 
        className="absolute inset-0 -z-10"
        style={{
          background: 'linear-gradient(to bottom, rgba(250, 248, 243, 0.92) 0%, rgba(247, 243, 237, 0.95) 100%)',
        }}
      />
      <div className="bg-transparent w-full">
      {/* 1. Modern Kinetic Exhibition Hero */}
      <section className="max-w-[1380px] mx-auto px-4 sm:px-8 pt-8 pb-12 sm:pt-10 sm:pb-16 lg:py-20">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 sm:gap-10 lg:gap-14 items-stretch">
          <div className="lg:col-span-6 flex flex-col justify-between space-y-8">
            <div className="space-y-6">
              <motion.p
                initial={shouldReduceMotion ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.22 }}
                className="text-xs tracking-[0.2em] uppercase text-[#787066]"
              >
                Autumn Salon 2026 · Curated Digital Viewing Room
              </motion.p>

              <motion.h1
                initial={shouldReduceMotion ? false : { opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.32, delay: 0.05, ease: [0.16, 1, 0.3, 1] }}
                className="font-serif text-4xl sm:text-5xl lg:text-[3.75rem] font-medium text-[#141312] leading-[1.05] tracking-[-0.01em]"
              >
                Collect original works{' '}
                <span className="italic font-normal text-[#8E6C2E]">directly</span>{' '}
                from contemporary ateliers.
              </motion.h1>

              <motion.p
                initial={shouldReduceMotion ? false : { opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.32, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
                className="text-base sm:text-lg text-[#575048] leading-relaxed max-w-xl"
              >
                ArtVerse unites independent fine artists, discerning private
                collectors, and studio dialogue—pairing transparent gallery pricing
                with live artwork-linked offer negotiation.
              </motion.p>

              <motion.div
                initial={shouldReduceMotion ? false : { opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.28, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
                className="flex flex-wrap items-center gap-3.5 pt-2"
              >
                <motion.div
                  whileHover={shouldReduceMotion ? undefined : { y: -2 }}
                  whileTap={shouldReduceMotion ? undefined : { scale: 0.98 }}
                >
                  <Link
                    to="/gallery"
                    className="inline-flex items-center gap-2 px-6 py-3.5 text-sm font-medium bg-[#141312] text-[#FAF8F3] rounded-xl hover:bg-[#292623] shadow-sm transition-colors whitespace-nowrap shrink-0"
                  >
                    <span>Explore Gallery</span>
                    <ArrowRight className="w-4 h-4 text-[#D4AE62]" />
                  </Link>
                </motion.div>

                <motion.div
                  whileHover={shouldReduceMotion ? undefined : { y: -2 }}
                  whileTap={shouldReduceMotion ? undefined : { scale: 0.98 }}
                >
                  <Link
                    to="/artists"
                    className="inline-flex items-center px-5 py-3.5 text-sm font-medium bg-white border border-[#DED6C6] text-[#141312] rounded-xl hover:border-[#B38B40] transition-colors whitespace-nowrap shrink-0"
                  >
                    Discover Artists
                  </Link>
                </motion.div>

                <Link
                  to="/signup"
                  className="inline-flex items-center gap-1 px-4 py-3 text-sm font-medium text-[#575048] hover:text-[#141312] transition-colors whitespace-nowrap shrink-0"
                >
                  <span>Join Community</span>
                  <ArrowUpRight className="w-4 h-4" />
                </Link>
              </motion.div>
            </div>

            {/* Interactive Featured Lot Switcher */}
            {heroWork && (
              <motion.div
                initial={shouldReduceMotion ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2, duration: 0.3 }}
                className="pt-6 border-t border-[#E6DFD3] space-y-4"
              >
                <AnimatePresence mode="wait">
                  <motion.div
                    key={heroWork.id}
                    initial={
                      shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 6 }
                    }
                    animate={{ opacity: 1, y: 0 }}
                    exit={
                      shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: -6 }
                    }
                    transition={{ duration: 0.18 }}
                    className="flex flex-col sm:flex-row sm:items-end justify-between gap-4"
                  >
                    <div>
                      <p className="text-xs text-[#787066]">
                        Spotlight Lot {String(safeIndex + 1).padStart(2, '0')} /{' '}
                        {String(heroPool.length).padStart(2, '0')} ·{' '}
                        {heroWork.accessionNumber}
                      </p>
                      <Link
                        to={`/artwork/${heroWork.id}`}
                        className="font-serif text-2xl font-semibold text-[#141312] hover:text-[#9E7B3B] transition-colors"
                      >
                        {heroWork.title}, {heroWork.year}
                      </Link>
                      <p className="text-xs text-[#575048]">
                        {heroArtist?.fullName} · {heroWork.medium}
                      </p>
                    </div>
                    <div className="sm:text-right">
                      <p className="font-mono text-lg font-medium text-[#141312] tabular-nums">
                        {formatMoney(heroWork.price, heroWork.currency)}{' '}
                        <span className="text-xs text-[#787066]">
                          {heroWork.currency}
                        </span>
                      </p>
                      <p className="text-xs text-[#787066]">
                        {formatSaleModeLabel(heroWork.saleMode)}
                      </p>
                    </div>
                  </motion.div>
                </AnimatePresence>

                {heroPool.length > 1 && (
                  <div className="flex items-center justify-between pt-1">
                    <div className="flex items-center gap-1.5">
                      {heroPool.map((item, idx) => {
                        const active = idx === safeIndex;
                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => setHeroIndex(idx)}
                            aria-label={`Spotlight ${item.title}`}
                            className="py-2 group focus:outline-none"
                          >
                            <span
                              className={`block h-1 rounded-full transition-all duration-300 ${
                                active
                                  ? 'w-10 bg-[#B38B40]'
                                  : 'w-4 bg-[#D8CFC0] group-hover:bg-[#B8AE9C]'
                              }`}
                            />
                          </button>
                        );
                      })}
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() =>
                          setHeroIndex(
                            (prev) => (prev - 1 + heroPool.length) % heroPool.length
                          )
                        }
                        aria-label="Previous spotlight work"
                        className="w-8 h-8 rounded-lg border border-[#DED6C6] bg-white flex items-center justify-center text-[#575048] hover:text-[#141312] hover:border-[#B38B40] transition-colors"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setHeroIndex((prev) => (prev + 1) % heroPool.length)
                        }
                        aria-label="Next spotlight work"
                        className="w-8 h-8 rounded-lg border border-[#DED6C6] bg-white flex items-center justify-center text-[#575048] hover:text-[#141312] hover:border-[#B38B40] transition-colors"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </div>

          {/* Right Animated Stage */}
          {heroWork && (
            <div
              onMouseEnter={() => setHeroPaused(true)}
              onMouseLeave={() => setHeroPaused(false)}
              className="lg:col-span-6"
            >
              <motion.div
                style={
                  shouldReduceMotion ? undefined : { y: heroImageParallax }
                }
                className="relative h-full min-h-[290px] sm:min-h-[380px] lg:min-h-[540px] rounded-2xl overflow-hidden border border-[#E6DFD3] bg-[#EAE3D5] shadow-[0_24px_60px_-20px_rgba(20,19,18,0.18)]"
              >
                <AnimatePresence mode="wait">
                  <motion.div
                    key={heroWork.id}
                    initial={
                      shouldReduceMotion
                        ? { opacity: 1 }
                        : { opacity: 0, scale: 1.04 }
                    }
                    animate={{ opacity: 1, scale: 1 }}
                    exit={
                      shouldReduceMotion
                        ? { opacity: 1 }
                        : { opacity: 0, scale: 0.985 }
                    }
                    transition={{ duration: 0.42, ease: [0.16, 1, 0.3, 1] }}
                    className="w-full h-full"
                  >
                    <Link
                      to={`/artwork/${heroWork.id}`}
                      className="group block relative w-full h-full min-h-[290px] sm:min-h-[380px] lg:min-h-[540px]"
                    >
                      <ArtworkImage
                        imageKey={heroWork.imageKey}
                        alt={heroWork.title}
                        className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.03]"
                      />
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent p-5 sm:p-8 text-[#FAF8F3] flex flex-wrap items-end justify-between gap-3 sm:gap-4">
                        <div>
                          <p className="text-xs text-[#DFD7C8]">
                            Fig. 0{safeIndex + 1} — {heroWork.dimensions} · Demo
                            Curatorial Highlight
                          </p>
                          <p className="font-serif text-2xl sm:text-3xl font-medium mt-0.5">
                            {heroWork.title}
                          </p>
                        </div>
                        <span className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-white/15 backdrop-blur-md text-xs font-medium text-[#FAF8F3] group-hover:bg-[#B38B40] group-hover:text-[#141312] transition-colors shrink-0">
                          <span>View Work</span>
                          <ArrowUpRight className="w-3.5 h-3.5" />
                        </span>
                      </div>
                    </Link>
                  </motion.div>
                </AnimatePresence>
              </motion.div>
            </div>
          )}
        </div>
      </section>

      {/* Operational Curatorial Strip */}
      <div className="border-y border-[#E6DFD3] bg-[#F3EFE6]">
        <div className="max-w-[1380px] mx-auto px-5 sm:px-8 py-4 flex flex-wrap items-center justify-between gap-4 text-xs text-[#575048]">
          <span>
            Direct Studio Provenance · Signed Certificates of Authenticity
          </span>
          <span>
            Three Acquisition Modes: Direct Purchase · Private Offer · Hybrid
            Collector Terms
          </span>
          <Link
            to="/messages"
            className="inline-flex items-center gap-1 font-medium text-[#9E7B3B] hover:text-[#141312] transition-colors whitespace-nowrap"
          >
            <span>Preview Collector Negotiation Desk</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* 2. Featured Artworks with Staggered Scroll Entrance */}
      <section className="max-w-[1380px] mx-auto px-5 sm:px-8 py-16 lg:py-24">
        <motion.div
          initial={shouldReduceMotion ? false : { opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-12"
        >
          <div>
            <p className="text-xs tracking-[0.18em] uppercase text-[#787066]">
              01 / Curated Viewing Room
            </p>
            <h2 className="font-serif text-3xl sm:text-4xl font-semibold text-[#141312] mt-1">
              Selected Works Available Now
            </h2>
          </div>
          <Link
            to="/gallery"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-[#9E7B3B] hover:text-[#141312] transition-colors whitespace-nowrap"
          >
            <span>Browse Complete Catalogue ({artworks.length})</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </motion.div>

        {isLoadingCatalog ? (
          <ArtworkGridSkeleton
            count={4}
            columnsClass="grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {featuredWorks.map((work, idx) => (
              <motion.div
                key={work.id}
                initial={shouldReduceMotion ? false : { opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.15 }}
                transition={{
                  duration: 0.32,
                  delay: shouldReduceMotion ? 0 : idx * 0.06,
                  ease: [0.16, 1, 0.3, 1],
                }}
              >
                <ArtworkCard artwork={work} />
              </motion.div>
            ))}
          </div>
        )}
      </section>

      {/* 3. Curated Thematic Collections */}
      <section className="bg-[#F3EFE6] border-y border-[#E6DFD3]">
        <div className="max-w-[1380px] mx-auto px-5 sm:px-8 py-16 lg:py-24">
          <motion.div
            initial={shouldReduceMotion ? false : { opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.3 }}
            className="mb-12"
          >
            <p className="text-xs tracking-[0.18em] uppercase text-[#787066]">
              02 / Thematic Capsules
            </p>
            <h2 className="font-serif text-3xl sm:text-4xl font-semibold text-[#141312] mt-1">
              Curated Collector Capsules
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <motion.div
              whileHover={shouldReduceMotion ? undefined : { y: -4 }}
              transition={{ duration: 0.2 }}
            >
              <Link
                to="/gallery?category=sculpture"
                className="group grid grid-cols-1 sm:grid-cols-12 h-full bg-white border border-[#E6DFD3] rounded-2xl overflow-hidden hover:border-[#CBB994] hover:shadow-[0_18px_40px_-18px_rgba(20,19,18,0.14)] transition-all"
              >
                <div className="sm:col-span-5 min-h-[250px] overflow-hidden">
                  <div className="w-full h-full transition-transform duration-500 group-hover:scale-105">
                    <ArtworkImage
                      imageKey="art_marble_form"
                      alt="Material & Mineral Permanence"
                    />
                  </div>
                </div>
                <div className="sm:col-span-7 p-6 sm:p-8 flex flex-col justify-between gap-4">
                  <div className="space-y-2.5">
                    <p className="text-xs text-[#787066]">
                      Curatorial Capsule · Pietrasanta & Antwerp
                    </p>
                    <h3 className="font-serif text-2xl sm:text-[1.65rem] font-semibold text-[#141312] group-hover:text-[#9E7B3B] transition-colors">
                      Material & Mineral Permanence
                    </h3>
                    <p className="text-sm text-[#575048] leading-relaxed">
                      Carved Statuario marble, travertine, raw linen, and earth
                      pigments that engage natural architectural shadow.
                    </p>
                  </div>
                  <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#9E7B3B] group-hover:text-[#141312] transition-colors">
                    <span>Explore Sculpture & Material Works</span>
                    <ArrowUpRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                  </span>
                </div>
              </Link>
            </motion.div>

            <motion.div
              whileHover={shouldReduceMotion ? undefined : { y: -4 }}
              transition={{ duration: 0.2 }}
            >
              <Link
                to="/gallery?category=photography"
                className="group grid grid-cols-1 sm:grid-cols-12 h-full bg-white border border-[#E6DFD3] rounded-2xl overflow-hidden hover:border-[#CBB994] hover:shadow-[0_18px_40px_-18px_rgba(20,19,18,0.14)] transition-all"
              >
                <div className="sm:col-span-5 min-h-[250px] overflow-hidden">
                  <div className="w-full h-full transition-transform duration-500 group-hover:scale-105">
                    <ArtworkImage
                      imageKey="art_nocturne_study"
                      alt="Studies in Architectural Silence"
                    />
                  </div>
                </div>
                <div className="sm:col-span-7 p-6 sm:p-8 flex flex-col justify-between gap-4">
                  <div className="space-y-2.5">
                    <p className="text-xs text-[#787066]">
                      Curatorial Capsule · Editions & Paper
                    </p>
                    <h3 className="font-serif text-2xl sm:text-[1.65rem] font-semibold text-[#141312] group-hover:text-[#9E7B3B] transition-colors">
                      Studies in Architectural Silence
                    </h3>
                    <p className="text-sm text-[#575048] leading-relaxed">
                      Selenium-toned silver gelatin darkroom prints, optical light
                      studies, and expressive charcoal rag drawings.
                    </p>
                  </div>
                  <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#9E7B3B] group-hover:text-[#141312] transition-colors">
                    <span>Explore Photography & Editions</span>
                    <ArrowUpRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                  </span>
                </div>
              </Link>
            </motion.div>
          </div>
        </div>
      </section>

      {/* 4. Featured Artists & Community Activity */}
      <section className="max-w-[1380px] mx-auto px-5 sm:px-8 py-16 lg:py-24 space-y-24">
        <div>
          <motion.div
            initial={shouldReduceMotion ? false : { opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.3 }}
            className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-12"
          >
            <div>
              <p className="text-xs tracking-[0.18em] uppercase text-[#787066]">
                03 / Studio Roster
              </p>
              <h2 className="font-serif text-3xl sm:text-4xl font-semibold text-[#141312] mt-1">
                Featured Contemporary Artists
              </h2>
            </div>
            <Link
              to="/artists"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-[#9E7B3B] hover:text-[#141312] transition-colors whitespace-nowrap"
            >
              <span>View All Artists</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {artists.map((artist, idx) => {
              const isFollowing = followedArtistIds.includes(artist.id);
              const artistWorksCount = artworks.filter(
                (a) => a.artistId === artist.id
              ).length;
              return (
                <motion.div
                  key={artist.id}
                  initial={shouldReduceMotion ? false : { opacity: 0, y: 18 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.15 }}
                  whileHover={shouldReduceMotion ? undefined : { y: -4 }}
                  transition={{
                    duration: 0.25,
                    delay: shouldReduceMotion ? 0 : idx * 0.05,
                  }}
                  className="p-6 bg-white border border-[#E6DFD3] rounded-2xl flex flex-col justify-between gap-5 hover:border-[#CBB994] hover:shadow-[0_16px_36px_-16px_rgba(20,19,18,0.12)] transition-shadow"
                >
                  <div className="space-y-4">
                    <div className="flex items-center gap-3.5">
                      <ProfileAvatar
                        name={artist.fullName}
                        avatarKey={artist.avatarUrl}
                        sizeClass="w-12 h-12 text-base"
                      />
                      <div className="min-w-0">
                        <Link
                          to={`/artists/${artist.id}`}
                          className="font-serif text-xl font-semibold text-[#141312] hover:text-[#9E7B3B] transition-colors block truncate"
                        >
                          {artist.fullName}
                        </Link>
                        <p className="text-xs text-[#787066] truncate">
                          {artist.location}
                        </p>
                      </div>
                    </div>

                    <p className="text-xs text-[#6B655E]">
                      {artist.discipline} · {artistWorksCount}{' '}
                      {artistWorksCount === 1 ? 'listed work' : 'listed works'}
                    </p>

                    <p className="text-sm text-[#575048] line-clamp-3 leading-relaxed">
                      {artist.bio}
                    </p>
                  </div>

                  <div className="pt-4 border-t border-[#EFEAE0] flex items-center justify-between gap-3">
                    <Link
                      to={`/artists/${artist.id}`}
                      className="text-xs font-medium text-[#141312] hover:text-[#9E7B3B] transition-colors whitespace-nowrap"
                    >
                      View Portfolio
                    </Link>
                    <motion.button
                      type="button"
                      whileTap={shouldReduceMotion ? undefined : { scale: 0.93 }}
                      onClick={() => toggleFollowArtist(artist.id)}
                      className={`px-3.5 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                        isFollowing
                          ? 'bg-[#141312] text-[#FAF8F3]'
                          : 'bg-[#F3EFE6] text-[#141312] hover:bg-[#E6DFD1]'
                      }`}
                    >
                      {isFollowing ? 'Following' : 'Follow'}
                    </motion.button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Community Activity Preview */}
        <div className="pt-10 border-t border-[#E6DFD3]">
          <motion.div
            initial={shouldReduceMotion ? false : { opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.3 }}
            className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-12"
          >
            <div>
              <p className="text-xs tracking-[0.18em] uppercase text-[#787066]">
                04 / Atelier & Collector Dialogue
              </p>
              <h2 className="font-serif text-3xl sm:text-4xl font-semibold text-[#141312] mt-1">
                From the Community Journal
              </h2>
            </div>
            <Link
              to="/community"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-[#9E7B3B] hover:text-[#141312] transition-colors whitespace-nowrap"
            >
              <span>Open Full Community Feed</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {recentPosts.map((post, idx) => {
              const author = profiles.find((p) => p.id === post.authorId);
              const linkedArtwork = post.artworkId
                ? artworks.find((a) => a.id === post.artworkId)
                : undefined;
              return (
                <motion.article
                  key={post.id}
                  initial={shouldReduceMotion ? false : { opacity: 0, y: 18 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.15 }}
                  whileHover={shouldReduceMotion ? undefined : { y: -4 }}
                  transition={{
                    duration: 0.25,
                    delay: shouldReduceMotion ? 0 : idx * 0.06,
                  }}
                  className="p-6 bg-white border border-[#E6DFD3] rounded-2xl flex flex-col justify-between gap-5 hover:border-[#CBB994] hover:shadow-[0_16px_36px_-16px_rgba(20,19,18,0.12)] transition-shadow"
                >
                  <div className="space-y-3">
                    <div className="flex items-center gap-2.5 text-xs text-[#787066]">
                      <span className="font-medium text-[#141312]">
                        {author?.fullName || 'ArtVerse Member'}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>{formatShortDate(post.createdAt)}</span>
                    </div>

                    <h3 className="font-serif text-xl font-semibold text-[#141312]">
                      {post.title || 'Studio Dispatch'}
                    </h3>

                    <p className="text-sm text-[#575048] line-clamp-3 leading-relaxed">
                      {post.body}
                    </p>
                  </div>

                  <div className="pt-4 border-t border-[#EFEAE0] flex items-center justify-between text-xs text-[#6B655E]">
                    <span className="truncate pr-2">
                      {linkedArtwork
                        ? `Re: ${linkedArtwork.title} (${formatCategoryLabel(
                            linkedArtwork.category
                          )})`
                        : 'Studio Note'}
                    </span>
                    <Link
                      to="/community"
                      className="font-medium text-[#9E7B3B] hover:text-[#141312] whitespace-nowrap shrink-0 transition-colors"
                    >
                      Read & Comment →
                    </Link>
                  </div>
                </motion.article>
              );
            })}
          </div>
        </div>
      </section>
      </div>
    </div>
  );
};
