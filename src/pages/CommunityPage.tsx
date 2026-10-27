import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { ArrowUpRight, Check, Heart, MessageCircle, Share2 } from 'lucide-react';
import { useArtVerse } from '../context/ArtVerseContext';
import { ArtworkImage, ProfileAvatar } from '../data/artworkImages';
import {
  formatMoney,
  formatRoleLabel,
  formatShortDate,
} from '../utils/formatters';
import atelierCover from '../assets/images/atelier_editorial_cover_1792993242654.jpg';

const EASE_OUT: [number, number, number, number] = [0.16, 1, 0.3, 1];

export const CommunityPage: React.FC = () => {
  const shouldReduceMotion = useReducedMotion();
  const navigate = useNavigate();
  const {
    posts,
    comments,
    artworks,
    profiles,
    likedPostIds,
    followedArtistIds,
    currentUser,
    authMode,
    createCommunityPost,
    addComment,
    toggleLikePost,
    toggleFollowArtist,
  } = useArtVerse();

  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [selectedArtworkId, setSelectedArtworkId] = useState<string>('');
  const [composerError, setComposerError] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);

  const [expandedComments, setExpandedComments] = useState<Record<string, boolean>>({});
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});
  const [copiedPostId, setCopiedPostId] = useState<string | null>(null);

  const handlePublishPost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      setComposerError('Sign in to publish to the community.');
      navigate('/login', { state: { from: { pathname: '/community' } } });
      return;
    }
    if (!body.trim()) {
      setComposerError('Please share a studio reflection, curatorial note, or question.');
      return;
    }
    setComposerError(null);
    setPublishing(true);
    try {
      const linked = artworks.find((a) => a.id === selectedArtworkId);
      await createCommunityPost({
        title: title.trim() || 'Community Note',
        body: body.trim(),
        artworkId: selectedArtworkId || undefined,
        imageKey: linked?.imageKey,
      });
      setTitle('');
      setBody('');
      setSelectedArtworkId('');
    } catch (err) {
      setComposerError(
        err instanceof Error ? err.message : 'Unable to publish community post.'
      );
    } finally {
      setPublishing(false);
    }
  };

  const handleCommentSubmit = async (e: React.FormEvent, postId: string) => {
    e.preventDefault();
    if (!currentUser) {
      navigate('/login', { state: { from: { pathname: '/community' } } });
      return;
    }
    const draft = (commentDrafts[postId] || '').trim();
    if (!draft) return;
    await addComment(postId, draft);
    setCommentDrafts((prev) => ({ ...prev, [postId]: '' }));
    setExpandedComments((prev) => ({ ...prev, [postId]: true }));
  };

  const handleShare = async (postId: string) => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/community#${postId}`);
    } catch {
      // Clipboard may be restricted in some sandboxes
    }
    setCopiedPostId(postId);
    setTimeout(() => {
      setCopiedPostId((prev) => (prev === postId ? null : prev));
    }, 2000);
  };

  return (
    <div className="w-full relative isolate">
      <div 
        className="absolute inset-0 -z-10"
        style={{
          backgroundImage: `url("${atelierCover}")`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundAttachment: 'fixed',
          opacity: 0.07,
        }}
      />
      <div 
        className="absolute inset-0 -z-10"
        style={{
          background: 'linear-gradient(to bottom, rgba(250, 248, 243, 0.94) 0%, rgba(247, 243, 237, 0.96) 100%)',
        }}
      />
      <div className="max-w-[1180px] mx-auto px-4 sm:px-8 py-8 sm:py-12 lg:py-16">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 sm:gap-10 items-start">
          {/* Left / Main Feed */}
          <div className="lg:col-span-8 space-y-7 sm:space-y-8 min-w-0">
            <motion.div
              initial={shouldReduceMotion ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, ease: EASE_OUT }}
            >
              <p className="text-xs font-medium tracking-wide text-[#8C6828]">
                Studio Journal & Collector Salon
              </p>
              <h1 className="font-serif text-4xl sm:text-5xl font-semibold text-[#141312] mt-1.5 text-balance">
                Community Dialogue
              </h1>
              <p className="text-sm sm:text-base text-[#5C554C] mt-2.5 leading-relaxed max-w-2xl">
                Work-in-progress dispatches from ateliers, exhibition notes, and collector
                discussions.
              </p>
            </motion.div>

            {/* Create Post Composer */}
            <motion.form
              initial={shouldReduceMotion ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: 0.05, ease: EASE_OUT }}
              onSubmit={handlePublishPost}
              className="bg-white border border-[#E6DFD3] rounded-2xl p-6 sm:p-7 space-y-4 shadow-2xs"
            >
              <div className="flex items-center justify-between gap-3">
                <h2 className="font-serif text-xl font-semibold text-[#141312]">
                  Publish a Studio Dispatch or Note
                </h2>
                <span className="text-xs text-[#7A7267]">
                  {authMode === 'authenticated'
                    ? `Posting as ${currentUser?.fullName}`
                    : 'Sign in to publish'}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label htmlFor="post-title" className="sr-only">
                    Headline
                  </label>
                  <input
                    id="post-title"
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Headline (e.g., Varnishing notes from the studio)"
                    className="w-full px-4 py-2.5 bg-[#FAF8F3] border border-[#D8D0C1] rounded-xl text-sm text-[#141312] placeholder:text-[#9A9184] focus:outline-none focus:border-[#B38B40] transition-colors"
                  />
                </div>
                <div>
                  <label htmlFor="post-artwork-select" className="sr-only">
                    Reference an artwork
                  </label>
                  <select
                    id="post-artwork-select"
                    value={selectedArtworkId}
                    onChange={(e) => setSelectedArtworkId(e.target.value)}
                    className="w-full px-4 py-2.5 bg-[#FAF8F3] border border-[#D8D0C1] rounded-xl text-sm text-[#141312] focus:outline-none focus:border-[#B38B40] transition-colors"
                  >
                    <option value="">Optional: Reference Catalogue Work</option>
                    {artworks.map((art) => (
                      <option key={art.id} value={art.id}>
                        {art.title} ({art.year})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label htmlFor="post-body" className="sr-only">
                  Post content
                </label>
                <textarea
                  id="post-body"
                  rows={3}
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="Share process insights, exhibition thoughts, or collecting notes..."
                  className="w-full px-4 py-3 bg-[#FAF8F3] border border-[#D8D0C1] rounded-xl text-sm text-[#141312] placeholder:text-[#9A9184] focus:outline-none focus:border-[#B38B40] transition-colors"
                />
              </div>

              {composerError && (
                <p role="alert" className="text-xs font-medium text-[#992E24]">
                  {composerError}
                </p>
              )}

              <div className="flex items-center justify-end">
                <motion.button
                  type="submit"
                  disabled={publishing}
                  whileTap={shouldReduceMotion ? undefined : { scale: 0.97 }}
                  className="px-5 py-2.5 text-xs font-medium bg-[#B38B40] text-[#141312] rounded-xl hover:bg-[#C69D4E] disabled:opacity-50 transition-colors whitespace-nowrap"
                >
                  {publishing ? 'Publishing...' : 'Publish to Feed'}
                </motion.button>
              </div>
            </motion.form>

            {/* Feed Posts */}
            {posts.length === 0 ? (
              <div className="p-12 bg-white border border-[#E6DFD3] rounded-2xl text-center space-y-2">
                <h3 className="font-serif text-2xl font-semibold text-[#141312]">
                  The journal is quiet
                </h3>
                <p className="text-sm text-[#5C554C]">
                  Be the first to share a studio dispatch or exhibition reflection above.
                </p>
              </div>
            ) : (
              <div className="space-y-7">
                <AnimatePresence initial={false}>
                  {posts.map((post, index) => {
                    const author = profiles.find((p) => p.id === post.authorId);
                    const linkedArtwork = post.artworkId
                      ? artworks.find((a) => a.id === post.artworkId)
                      : undefined;
                    const postComments = comments.filter((c) => c.postId === post.id);
                    const isLiked = likedPostIds.includes(post.id);
                    const isFollowingAuthor = author
                      ? followedArtistIds.includes(author.id)
                      : false;
                    const commentsOpen = Boolean(expandedComments[post.id]);

                    return (
                      <motion.article
                        id={post.id}
                        key={post.id}
                        layout="position"
                        initial={
                          shouldReduceMotion ? false : { opacity: 0, y: 16 }
                        }
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, margin: '-40px' }}
                        transition={{
                          duration: 0.28,
                          delay: Math.min(index * 0.04, 0.16),
                          ease: EASE_OUT,
                        }}
                        className="bg-white border border-[#E6DFD3] rounded-2xl overflow-hidden hover:border-[#D3C7B2] transition-colors"
                      >
                        <div className="p-6 sm:p-7 space-y-4">
                          <div className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-3.5 min-w-0">
                              <ProfileAvatar
                                name={author?.fullName || 'Art Universe Member'}
                                avatarKey={author?.avatarUrl}
                                sizeClass="w-11 h-11 text-sm"
                              />
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  {author?.role === 'artist' ? (
                                    <Link
                                      to={`/artists/${author.id}`}
                                      className="text-sm font-medium text-[#141312] hover:text-[#B38B40] transition-colors truncate"
                                    >
                                      {author.fullName}
                                    </Link>
                                  ) : (
                                    <span className="text-sm font-medium text-[#141312] truncate">
                                      {author?.fullName || 'Art Universe Member'}
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs text-[#7A7267]">
                                  {author ? formatRoleLabel(author.role) : 'Member'} ·{' '}
                                  {formatShortDate(post.createdAt)}
                                </p>
                              </div>
                            </div>

                            {author && author.role === 'artist' && (
                              <motion.button
                                type="button"
                                whileTap={
                                  shouldReduceMotion ? undefined : { scale: 0.95 }
                                }
                                onClick={() => {
                                  if (!currentUser) {
                                    navigate('/login', {
                                      state: { from: { pathname: '/community' } },
                                    });
                                    return;
                                  }
                                  void toggleFollowArtist(author.id);
                                }}
                                className={`px-3.5 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                                  isFollowingAuthor
                                    ? 'bg-[#141312] text-[#FAF8F3]'
                                    : 'bg-[#F3EFE6] text-[#141312] hover:bg-[#E7E0D2]'
                                }`}
                              >
                                {isFollowingAuthor ? 'Following' : 'Follow'}
                              </motion.button>
                            )}
                          </div>

                          {post.title && (
                            <h2 className="font-serif text-2xl sm:text-[26px] font-semibold text-[#141312] leading-snug text-balance">
                              {post.title}
                            </h2>
                          )}

                          <p className="text-sm sm:text-base text-[#4F4840] leading-relaxed max-w-prose">
                            {post.body}
                          </p>
                        </div>

                        {post.imageKey && (
                          <div className="aspect-[16/10] bg-[#EFEAE0] border-y border-[#ECE6DA] overflow-hidden group">
                            <ArtworkImage
                              imageKey={post.imageKey}
                              alt={post.title || 'Studio photograph'}
                              className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.025]"
                            />
                          </div>
                        )}

                        {linkedArtwork && (
                          <Link
                            to={`/artwork/${linkedArtwork.id}`}
                            className="px-5 sm:px-7 py-4 bg-[#FAF8F3] border-b border-[#ECE6DA] flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4 group hover:bg-[#F3EFE6] transition-colors"
                          >
                            <div className="min-w-0">
                              <p className="text-xs text-[#7A7267]">
                                Referenced Catalogue Work
                              </p>
                              <p className="font-serif text-lg font-semibold text-[#141312] group-hover:text-[#B38B40] transition-colors truncate">
                                {linkedArtwork.title}
                              </p>
                            </div>
                            <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                              <p className="font-mono text-sm text-[#141312] tabular-nums">
                                {formatMoney(linkedArtwork.price, linkedArtwork.currency)}{' '}
                                {linkedArtwork.currency}
                              </p>
                              <span className="inline-flex items-center gap-1 text-xs font-medium text-[#8C6828] group-hover:translate-x-0.5 transition-transform">
                                View Work
                                <ArrowUpRight className="w-3.5 h-3.5" />
                              </span>
                            </div>
                          </Link>
                        )}

                        {/* Interaction Controls */}
                        <div className="px-5 sm:px-7 py-3.5 flex flex-wrap items-center justify-between gap-3 text-xs text-[#5C554C]">
                          <div className="flex items-center gap-4 sm:gap-6">
                            <motion.button
                              type="button"
                              whileTap={shouldReduceMotion ? undefined : { scale: 0.9 }}
                              onClick={() => {
                                if (!currentUser) {
                                  navigate('/login', {
                                    state: { from: { pathname: '/community' } },
                                  });
                                  return;
                                }
                                void toggleLikePost(post.id);
                              }}
                              aria-pressed={isLiked}
                              className={`inline-flex items-center gap-1.5 font-medium transition-colors whitespace-nowrap ${
                                isLiked ? 'text-[#8C6828]' : 'hover:text-[#141312]'
                              }`}
                            >
                              <motion.span
                                key={isLiked ? 'liked' : 'unliked'}
                                initial={
                                  shouldReduceMotion ? false : { scale: 0.75 }
                                }
                                animate={{ scale: 1 }}
                                transition={{
                                  type: 'spring',
                                  stiffness: 520,
                                  damping: 22,
                                }}
                                className="inline-flex"
                              >
                                <Heart
                                  className={`w-4 h-4 ${
                                    isLiked
                                      ? 'fill-[#B38B40] text-[#B38B40]'
                                      : ''
                                  }`}
                                />
                              </motion.span>
                              <span className="tabular-nums">{post.likesCount}</span>
                              <span>Appreciate</span>
                            </motion.button>

                            <button
                              type="button"
                              onClick={() =>
                                setExpandedComments((prev) => ({
                                  ...prev,
                                  [post.id]: !commentsOpen,
                                }))
                              }
                              className="inline-flex items-center gap-1.5 font-medium hover:text-[#141312] transition-colors whitespace-nowrap"
                            >
                              <MessageCircle className="w-4 h-4" />
                              <span className="tabular-nums">{postComments.length}</span>
                              <span>Comments</span>
                            </button>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleShare(post.id)}
                            className="inline-flex items-center gap-1.5 font-medium hover:text-[#141312] transition-colors whitespace-nowrap"
                          >
                            {copiedPostId === post.id ? (
                              <>
                                <Check className="w-3.5 h-3.5 text-[#B38B40]" />
                                <span className="text-[#8C6828]">Link Copied</span>
                              </>
                            ) : (
                              <>
                                <Share2 className="w-3.5 h-3.5" />
                                <span>Share</span>
                              </>
                            )}
                          </button>
                        </div>

                        {/* Expandable Comments */}
                        <AnimatePresence>
                          {commentsOpen && (
                            <motion.div
                              initial={
                                shouldReduceMotion
                                  ? { opacity: 0 }
                                  : { opacity: 0, y: -6 }
                              }
                              animate={{ opacity: 1, y: 0 }}
                              exit={
                                shouldReduceMotion
                                  ? { opacity: 0 }
                                  : { opacity: 0, y: -4 }
                              }
                              transition={{ duration: 0.18, ease: EASE_OUT }}
                              className="px-6 sm:px-7 py-4 bg-[#FAF8F3] border-t border-[#ECE6DA] space-y-4"
                            >
                              {postComments.length > 0 && (
                                <div className="space-y-3">
                                  {postComments.map((c) => {
                                    const commenter = profiles.find(
                                      (p) => p.id === c.authorId
                                    );
                                    return (
                                      <motion.div
                                        key={c.id}
                                        initial={
                                          shouldReduceMotion
                                            ? false
                                            : { opacity: 0, y: 4 }
                                        }
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ duration: 0.16, ease: EASE_OUT }}
                                        className="text-sm space-y-0.5"
                                      >
                                        <div className="flex items-center gap-2 text-xs text-[#7A7267]">
                                          <span className="font-medium text-[#141312]">
                                            {commenter?.fullName || 'Collector'}
                                          </span>
                                          <span aria-hidden="true">·</span>
                                          <span>{formatShortDate(c.createdAt)}</span>
                                        </div>
                                        <p className="text-[#4F4840] leading-relaxed">
                                          {c.body}
                                        </p>
                                      </motion.div>
                                    );
                                  })}
                                </div>
                              )}

                              <form
                                onSubmit={(e) => handleCommentSubmit(e, post.id)}
                                className="flex items-center gap-2 pt-1"
                              >
                                <label
                                  htmlFor={`comment-input-${post.id}`}
                                  className="sr-only"
                                >
                                  Add a comment
                                </label>
                                <input
                                  id={`comment-input-${post.id}`}
                                  type="text"
                                  value={commentDrafts[post.id] || ''}
                                  onChange={(e) =>
                                    setCommentDrafts((prev) => ({
                                      ...prev,
                                      [post.id]: e.target.value,
                                    }))
                                  }
                                  placeholder="Write a response..."
                                  className="flex-1 px-3.5 py-2 bg-white border border-[#D8D0C1] rounded-xl text-xs text-[#141312] placeholder:text-[#9A9184] focus:outline-none focus:border-[#B38B40] transition-colors"
                                />
                                <motion.button
                                  type="submit"
                                  whileTap={
                                    shouldReduceMotion ? undefined : { scale: 0.96 }
                                  }
                                  className="px-4 py-2 text-xs font-medium bg-[#141312] text-[#FAF8F3] rounded-xl hover:bg-[#2A2724] transition-colors whitespace-nowrap shrink-0"
                                >
                                  Post
                                </motion.button>
                              </form>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.article>
                    );
                  })}
                </AnimatePresence>
              </div>
            )}
          </div>

          {/* Right Sidebar: Artists to Follow */}
          <aside className="lg:col-span-4 space-y-6 lg:sticky lg:top-24">
            <motion.div
              initial={shouldReduceMotion ? false : { opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: 0.08, ease: EASE_OUT }}
              className="bg-white border border-[#E6DFD3] rounded-2xl p-6 space-y-5"
            >
              <div>
                <h2 className="font-serif text-2xl font-semibold text-[#141312]">
                  Ateliers to Follow
                </h2>
                <p className="text-xs text-[#6B655E] mt-1 leading-relaxed">
                  Stay informed when studios publish new works or salon dispatches.
                </p>
              </div>

              <div className="space-y-4">
                {profiles
                  .filter((p) => p.role === 'artist')
                  .map((artist) => {
                    const following = followedArtistIds.includes(artist.id);
                    return (
                      <div
                        key={artist.id}
                        className="flex items-center justify-between gap-3 pt-3.5 first:pt-0 border-t first:border-t-0 border-[#ECE6DA]"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <ProfileAvatar
                            name={artist.fullName}
                            avatarKey={artist.avatarUrl}
                            sizeClass="w-9 h-9 text-xs"
                          />
                          <div className="min-w-0">
                            <Link
                              to={`/artists/${artist.id}`}
                              className="text-sm font-medium text-[#141312] hover:text-[#B38B40] transition-colors block truncate"
                            >
                              {artist.fullName}
                            </Link>
                            <p className="text-xs text-[#7A7267] truncate">
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
                                state: { from: { pathname: '/community' } },
                              });
                              return;
                            }
                            void toggleFollowArtist(artist.id);
                          }}
                          className={`px-3.5 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                            following
                              ? 'bg-[#141312] text-[#FAF8F3]'
                              : 'bg-[#F3EFE6] text-[#141312] hover:bg-[#E7E0D2]'
                          }`}
                        >
                          {following ? 'Following' : 'Follow'}
                        </motion.button>
                      </div>
                    );
                  })}
              </div>
            </motion.div>
          </aside>
        </div>
      </div>
    </div>
  );
};
