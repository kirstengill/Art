import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, CalendarDays, Play, Radio, Video } from 'lucide-react';
import { useArtVerse } from '../context/ArtVerseContext';
import { fetchOnlineClasses } from '../db/onlineClassesRepository';
import { onlineClassEmbedUrl } from '../utils/onlineClassVideo';
import type { OnlineClass } from '../types/onlineClasses';

type FeedFilter = 'live' | 'upcoming' | 'recorded' | 'tutorials';

const FILTERS: Array<{ id: FeedFilter; label: string }> = [
  { id: 'live', label: 'Live Now' },
  { id: 'upcoming', label: 'Upcoming Classes' },
  { id: 'recorded', label: 'Recorded Classes' },
  { id: 'tutorials', label: 'Art Tutorials' },
];

function scheduledDate(value: string | null): string | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? null
    : new Intl.DateTimeFormat(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short',
      }).format(date);
}

function classBadge(item: OnlineClass): { label: string; style: string } {
  if (item.status === 'live') {
    return { label: 'LIVE NOW', style: 'bg-red-700 text-white' };
  }
  if (item.status === 'completed') {
    return { label: 'RECORDED', style: 'bg-[#e7d8b6] text-[#58451f]' };
  }
  if (item.status === 'cancelled') {
    return { label: 'CANCELLED', style: 'bg-stone-200 text-stone-600' };
  }
  return { label: 'UPCOMING', style: 'bg-emerald-100 text-emerald-800' };
}

export const OnlineClassesPage: React.FC = () => {
  const { currentUser, isAuthLoading } = useArtVerse();
  const [classes, setClasses] = useState<OnlineClass[]>([]);
  const [filter, setFilter] = useState<FeedFilter>('live');
  const [selected, setSelected] = useState<OnlineClass | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const canWatch = Boolean(
    currentUser &&
    (
      (
        ['artist', 'collector'].includes(currentUser.role) &&
        ['active', 'pending'].includes(currentUser.accountStatus)
      ) ||
      (currentUser.role === 'admin' && currentUser.accountStatus === 'active')
    )
  );

  useEffect(() => {
    if (!canWatch) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchOnlineClasses()
      .then((items) => {
        if (!cancelled) setClasses(items);
      })
      .catch((reason: unknown) => {
        if (!cancelled) {
          setError(reason instanceof Error ? reason.message : 'Unable to load online classes.');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [canWatch]);

  const visibleClasses = useMemo(() => {
    if (filter === 'live') return classes.filter((item) => item.status === 'live');
    if (filter === 'upcoming') {
      return classes.filter(
        (item) => item.status === 'scheduled' || (item.status === 'cancelled' && item.scheduledAt)
      );
    }
    if (filter === 'recorded') return classes.filter((item) => item.status === 'completed');
    return classes.filter((item) => item.category === 'art_tutorial');
  }, [classes, filter]);

  return (
    <div className="min-h-[calc(100dvh-4rem)] bg-[#f7f3ea]">
      <section className="bg-[#1b1916] px-5 py-12 text-[#faf8f3] sm:px-8 sm:py-16">
        <div className="mx-auto max-w-7xl">
          <Link to="/" className="inline-flex items-center gap-2 text-xs text-white/60 hover:text-white">
            <ArrowLeft className="h-4 w-4" /> Louvre Singa
          </Link>
          <div className="mt-8 max-w-3xl">
            <p className="text-[10px] uppercase tracking-[0.3em] text-[#d3b578]">Learn from the makers</p>
            <h1 className="mt-3 font-serif text-4xl font-medium sm:text-6xl">Online Classes</h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-white/65 sm:text-base">
              Join live studio sessions, discover new techniques, and revisit recorded lessons
              from Louvre Singa artists.
            </p>
          </div>
          <div className="mt-8 flex flex-wrap gap-2">
            {FILTERS.map(({ id, label }) => (
              <button
                key={id}
                type="button"
                onClick={() => setFilter(id)}
                aria-pressed={filter === id}
                className={`rounded-full border px-4 py-2 text-xs transition-colors ${
                  filter === id
                    ? 'border-[#d3b578] bg-[#d3b578] text-[#1b1916]'
                    : 'border-white/20 text-white/75 hover:border-white/50'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-7xl px-5 py-9 sm:px-8 sm:py-12">
        {isAuthLoading ? (
          <p role="status" className="py-12 text-center text-sm text-[#655d50]">Checking your account…</p>
        ) : !canWatch ? (
          <section className="mx-auto max-w-xl rounded-3xl border border-[#e5dac4] bg-white p-8 text-center shadow-sm sm:p-12">
            <Video className="mx-auto h-9 w-9 text-[#a6813b]" />
            <h2 className="mt-5 font-serif text-2xl">A studio seat is waiting for you</h2>
            <p className="mt-3 text-sm leading-6 text-[#655d50]">
              Online Classes are free for registered Artists and Collectors. Sign in to browse
              the class schedule and watch lessons.
            </p>
            <Link
              to="/login"
              state={{ from: { pathname: '/online-classes' } }}
              className="mt-6 inline-flex rounded-lg bg-[#1b1916] px-5 py-3 text-xs font-semibold text-white hover:bg-[#332d23]"
            >
              Sign in to watch
            </Link>
          </section>
        ) : (
          <>
            {error && (
              <div role="alert" className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
                {error}
              </div>
            )}
            {loading ? (
              <p role="status" className="py-12 text-center text-sm text-[#655d50]">Loading classes…</p>
            ) : visibleClasses.length === 0 ? (
              <section className="rounded-3xl border border-dashed border-[#d8cbb2] bg-white/60 px-6 py-16 text-center">
                <Radio className="mx-auto h-8 w-8 text-[#a6813b]" />
                <h2 className="mt-4 font-serif text-2xl">No classes here just yet</h2>
                <p className="mt-2 text-sm text-[#655d50]">Check back soon for the next studio session.</p>
              </section>
            ) : (
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {visibleClasses.map((item) => {
                  const badge = classBadge(item);
                  return (
                    <article key={item.id} className="overflow-hidden rounded-2xl border border-[#e7dece] bg-white shadow-sm transition-shadow hover:shadow-lg">
                      <div className="relative aspect-[16/10] bg-[#e8e1d5]">
                        {item.thumbnailUrl ? (
                          <img src={item.thumbnailUrl} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full items-center justify-center bg-gradient-to-br from-[#322b20] to-[#9b7a44]">
                            <Video className="h-10 w-10 text-white/60" />
                          </div>
                        )}
                        <span className={`absolute left-3 top-3 rounded-full px-3 py-1 text-[10px] font-bold tracking-wider ${badge.style}`}>
                          {badge.label}
                        </span>
                      </div>
                      <div className="p-5">
                        <p className="text-[10px] uppercase tracking-[0.18em] text-[#927238]">
                          {item.category.replaceAll('_', ' ')}
                        </p>
                        <h2 className="mt-2 font-serif text-xl font-semibold text-[#201e1a]">{item.title}</h2>
                        <p className="mt-2 text-xs text-[#6e675b]">With {item.instructorName}</p>
                        {item.status === 'scheduled' && item.scheduledAt && (
                          <p className="mt-3 flex items-center gap-2 text-xs text-[#655d50]">
                            <CalendarDays className="h-3.5 w-3.5" /> {scheduledDate(item.scheduledAt)}
                          </p>
                        )}
                        <button
                          type="button"
                          disabled={item.status === 'cancelled'}
                          onClick={() => setSelected(item)}
                          className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#211f1a] px-4 py-3 text-xs font-semibold text-white hover:bg-[#3b3428] disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <Play className="h-3.5 w-3.5" />
                          {item.status === 'scheduled' ? 'Class details' : 'Watch Class'}
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </>
        )}
      </main>

      {selected && (
        <div
          className="fixed inset-0 z-[70] flex items-end justify-center bg-black/75 p-0 backdrop-blur-sm sm:items-center sm:p-5"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setSelected(null);
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="class-viewer-title"
            className="max-h-[95dvh] w-full max-w-5xl overflow-y-auto rounded-t-2xl bg-[#181715] text-white sm:rounded-2xl"
          >
            <div className="flex items-start justify-between gap-4 p-5 sm:px-7">
              <div>
                <span className={`inline-flex rounded-full px-3 py-1 text-[10px] font-bold tracking-wider ${classBadge(selected).style}`}>
                  {classBadge(selected).label}
                </span>
                <h2 id="class-viewer-title" className="mt-3 font-serif text-2xl sm:text-3xl">{selected.title}</h2>
                <p className="mt-1 text-xs text-white/55">Presented by {selected.instructorName}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelected(null)}
                aria-label="Back to classes"
                className="shrink-0 rounded-lg border border-white/20 px-3 py-2 text-xs text-white/80 hover:bg-white/10"
              >
                Back to Classes
              </button>
            </div>
            {selected.status === 'scheduled' ? (
              <div className="mx-5 mb-5 rounded-xl border border-[#d3b578]/30 bg-[#d3b578]/10 p-6 text-center sm:mx-7">
                <CalendarDays className="mx-auto h-7 w-7 text-[#d3b578]" />
                <p className="mt-3 text-sm font-medium">This class is coming up</p>
                <p className="mt-1 text-sm text-white/65">{scheduledDate(selected.scheduledAt) || 'Starting time to be announced'}</p>
              </div>
            ) : (
              <div className={`mx-auto w-full ${selected.provider === 'tiktok' ? 'max-w-[360px] px-4' : 'px-0 sm:px-7'}`}>
                <div className={`relative overflow-hidden bg-black ${selected.provider === 'tiktok' ? 'aspect-[9/16] rounded-xl' : 'aspect-video'}`}>
                  <iframe
                    key={`${selected.provider}-${selected.videoId}`}
                    src={onlineClassEmbedUrl(selected.provider, selected.videoId)}
                    title={selected.title}
                    className="absolute inset-0 h-full w-full border-0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                    referrerPolicy="strict-origin-when-cross-origin"
                  />
                </div>
              </div>
            )}
            <div className="space-y-3 px-5 py-5 sm:px-7 sm:py-6">
              {selected.status === 'live' && (
                <p className="inline-flex items-center gap-2 text-xs font-semibold text-red-300">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" /> LIVE NOW
                </p>
              )}
              {selected.scheduledAt && selected.status !== 'scheduled' && (
                <p className="text-xs text-white/55">Scheduled {scheduledDate(selected.scheduledAt)}</p>
              )}
              <p className="whitespace-pre-line text-sm leading-7 text-white/70">{selected.description}</p>
              <p className="text-[11px] leading-5 text-white/40">
                If playback is unavailable, the video may be private, deleted, or not enabled for embedding.
              </p>
              <a
                href={selected.videoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex text-xs text-[#e2c485] underline underline-offset-4 hover:text-white"
              >
                Open original video
              </a>
            </div>
          </section>
        </div>
      )}
    </div>
  );
};
