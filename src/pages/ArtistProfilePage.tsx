import React from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { motion, useReducedMotion } from 'motion/react';
import { ArrowLeft, MessageSquare } from 'lucide-react';
import { useArtVerse } from '../context/ArtVerseContext';
import { ArtworkImage, ProfileAvatar } from '../data/artworkImages';
import { ArtworkCard } from '../components/artwork/ArtworkCard';
import { ArtworkGridSkeleton } from '../components/ui/Skeletons';
import { formatShortDate } from '../utils/formatters';

const EASE_OUT: [number, number, number, number] = [0.16, 1, 0.3, 1];

export const ArtistProfilePage: React.FC = () => {
  const shouldReduceMotion = useReducedMotion();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const {
    getProfileById,
    artworks,
    posts,
    followedArtistIds,
    isLoadingCatalog,
    toggleFollowArtist,
    openOrCreateConversation,
    currentUser,
  } = useArtVerse();

  const artist = id ? getProfileById(id) : undefined;

  if (!artist) {
    return (
      <div className="max-w-[1360px] mx-auto px-5 sm:px-8 py-24 text-center space-y-4">
        <h1 className="font-serif text-3xl font-semibold text-[#141312]">
          Artist Profile Not Found
        </h1>
        <Link
          to="/artists"
          className="inline-flex items-center px-5 py-2.5 text-sm font-medium bg-[#141312] text-[#FAF8F3] rounded-xl"
        >
          Back to Artists
        </Link>
      </div>
    );
  }

  const artistWorks = artworks.filter((a) => a.artistId === artist.id);
  const artistPosts = posts.filter((p) => p.authorId === artist.id);
  const isFollowing = followedArtistIds.includes(artist.id);

  const handleMessageArtist = async () => {
    if (!currentUser) {
      navigate('/login', { state: { from: { pathname: `/artists/${artist.id}` } } });
      return;
    }
    if (artistWorks.length > 0) {
      const conv = await openOrCreateConversation(artistWorks[0].id);
      navigate(`/messages?conv=${conv.id}`);
    } else {
      navigate('/messages');
    }
  };

  return (
    <div className="w-full">
      {/* Studio Cover Banner */}
      <div className="relative h-52 sm:h-72 lg:h-84 w-full overflow-hidden border-b border-[#E6DFD3] bg-[#141312]">
        <motion.div
          initial={shouldReduceMotion ? false : { scale: 1.05, opacity: 0.8 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.6, ease: EASE_OUT }}
          className="w-full h-full"
        >
          <ArtworkImage
            imageKey={artist.coverUrl || 'atelier_editorial_cover'}
            alt={`${artist.fullName} atelier`}
            className="w-full h-full object-cover opacity-85"
          />
        </motion.div>
        <div className="absolute inset-0 bg-gradient-to-t from-[#141312]/80 via-[#141312]/30 to-transparent" />
        <div className="absolute top-6 left-5 sm:left-8">
          <Link
            to="/artists"
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#141312]/75 backdrop-blur-md text-[#FAF8F3] text-xs font-medium hover:bg-[#141312] transition-colors whitespace-nowrap"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            All Artists
          </Link>
        </div>
      </div>

      <div className="max-w-[1360px] mx-auto px-5 sm:px-8 pb-20">
        {/* Profile Header */}
        <motion.div
          initial={shouldReduceMotion ? false : { opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28, ease: EASE_OUT }}
          className="relative -mt-14 bg-white border border-[#E6DFD3] rounded-2xl p-6 sm:p-9 mb-14 shadow-sm"
        >
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
            <div className="flex flex-col sm:flex-row sm:items-center gap-5">
              <ProfileAvatar
                name={artist.fullName}
                avatarKey={artist.avatarUrl}
                sizeClass="w-20 h-20 text-2xl"
              />
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2 text-xs text-[#7A7267]">
                  <span>{artist.location}</span>
                  <span aria-hidden="true">·</span>
                  <span>{artist.discipline}</span>
                </div>
                <h1 className="font-serif text-3xl sm:text-4xl font-semibold text-[#141312] text-balance">
                  {artist.fullName}
                </h1>
                <p className="text-xs text-[#6B655E]">@{artist.handle}</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <motion.button
                type="button"
                whileTap={shouldReduceMotion ? undefined : { scale: 0.96 }}
                onClick={() => {
                  if (!currentUser) {
                    navigate('/login', {
                      state: { from: { pathname: `/artists/${artist.id}` } },
                    });
                    return;
                  }
                  void toggleFollowArtist(artist.id);
                }}
                className={`px-5 py-2.5 text-xs font-medium rounded-xl transition-colors whitespace-nowrap shrink-0 ${
                  isFollowing
                    ? 'bg-[#141312] text-[#FAF8F3]'
                    : 'bg-[#B38B40] text-[#141312] hover:bg-[#C69D4E]'
                }`}
              >
                {isFollowing ? 'Following Studio' : 'Follow Artist'}
              </motion.button>
              {(!currentUser ||
                currentUser.role === 'collector' ||
                currentUser.role === 'art_lover') && (
                <motion.button
                  type="button"
                  whileTap={shouldReduceMotion ? undefined : { scale: 0.96 }}
                  onClick={handleMessageArtist}
                  className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-medium bg-[#FAF8F3] border border-[#D8D0C1] text-[#141312] rounded-xl hover:border-[#B38B40] transition-colors whitespace-nowrap shrink-0"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  Message Studio
                </motion.button>
              )}
            </div>
          </div>

          <p className="mt-6 pt-6 border-t border-[#ECE6DA] text-sm sm:text-base text-[#4F4840] leading-relaxed max-w-3xl">
            {artist.bio}
          </p>
        </motion.div>

        {/* Portfolio Grid */}
        <section className="space-y-8">
          <div className="flex items-end justify-between">
            <div>
              <p className="text-xs font-medium tracking-wide text-[#8C6828]">
                Catalogue Raisonné & Available Works
              </p>
              <h2 className="font-serif text-3xl font-semibold text-[#141312] mt-1 tabular-nums">
                Studio Portfolio ({artistWorks.length})
              </h2>
            </div>
          </div>

          {isLoadingCatalog ? (
            <ArtworkGridSkeleton count={3} />
          ) : artistWorks.length === 0 ? (
            <div className="p-12 bg-white border border-[#E6DFD3] rounded-2xl text-center text-sm text-[#6B655E]">
              No public works currently listed in this artist’s viewing room.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-7">
              {artistWorks.map((work, idx) => (
                <motion.div
                  key={work.id}
                  initial={shouldReduceMotion ? false : { opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-40px' }}
                  transition={{
                    duration: 0.25,
                    delay: Math.min(idx * 0.05, 0.2),
                    ease: EASE_OUT,
                  }}
                >
                  <ArtworkCard artwork={work} />
                </motion.div>
              ))}
            </div>
          )}
        </section>

        {/* Studio Activity & Posts */}
        <section className="mt-16 pt-14 border-t border-[#E6DFD3] space-y-8">
          <div>
            <p className="text-xs font-medium tracking-wide text-[#8C6828]">
              Atelier Notes
            </p>
            <h2 className="font-serif text-3xl font-semibold text-[#141312] mt-1">
              Recent Studio Activity
            </h2>
          </div>

          {artistPosts.length === 0 ? (
            <p className="text-sm text-[#6B655E]">
              No recent studio journal dispatches published yet.
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {artistPosts.map((post, idx) => (
                <motion.article
                  key={post.id}
                  initial={shouldReduceMotion ? false : { opacity: 0, y: 14 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-40px' }}
                  transition={{
                    duration: 0.24,
                    delay: Math.min(idx * 0.06, 0.18),
                    ease: EASE_OUT,
                  }}
                  className="p-6 sm:p-7 bg-white border border-[#E6DFD3] hover:border-[#D0C3AA] rounded-2xl space-y-3 transition-colors"
                >
                  <p className="text-xs text-[#7A7267]">
                    {formatShortDate(post.createdAt)} · Studio Dispatch
                  </p>
                  <h3 className="font-serif text-xl font-semibold text-[#141312]">
                    {post.title}
                  </h3>
                  <p className="text-sm text-[#5C554C] leading-relaxed">{post.body}</p>
                  <div className="pt-2">
                    <Link
                      to="/community"
                      className="text-xs font-medium text-[#8C6828] hover:text-[#141312] transition-colors"
                    >
                      Join Discussion in Community →
                    </Link>
                  </div>
                </motion.article>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};
