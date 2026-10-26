import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Activity,
  ArrowLeft,
  ArrowRight,
  Brush,
  CreditCard,
  Image,
  LayoutDashboard,
  LogOut,
  Search,
  Users,
} from 'lucide-react';
import { useArtVerse } from '../context/ArtVerseContext';
import { artverseApi } from '../services/artverseApi';
import type {
  AdminContentKind,
  AdminContentRecord,
  AdminOverview,
  AdminOrderRecord,
  AdminPageResult,
  AdminRoleFilter,
  AdminTimeframe,
  AdminUserRecord,
} from '../types/admin';
import { formatMoney, formatRoleLabel, formatShortDate } from '../utils/formatters';
import { ArtworkImage } from '../data/artworkImages';

type AdminSection = 'overview' | 'users' | 'artists' | 'content' | 'orders';

const NAV_ITEMS: Array<{ id: AdminSection; label: string; icon: React.FC<{ className?: string }> }> = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'users', label: 'Users', icon: Users },
  { id: 'artists', label: 'Artists', icon: Brush },
  { id: 'content', label: 'Artwork & posts', icon: Image },
  { id: 'orders', label: 'Purchase intents', icon: CreditCard },
];

function ErrorNotice({ message }: { message: string }) {
  return (
    <div role="alert" className="rounded-xl border border-red-300/40 bg-red-950/50 p-4 text-sm text-red-100">
      {message}
    </div>
  );
}

function StatCard({
  label,
  value,
  detail,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  detail?: string;
  icon: React.FC<{ className?: string }>;
}) {
  return (
    <article className="rounded-2xl border border-white/15 bg-white/[0.07] p-5 shadow-lg backdrop-blur-lg">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.16em] text-white/65">{label}</p>
          <p className="mt-3 font-serif text-3xl font-semibold tabular-nums text-white">{value}</p>
          {detail && <p className="mt-2 text-xs text-white/55">{detail}</p>}
        </div>
        <Icon className="h-5 w-5 text-[#e2c485]" />
      </div>
    </article>
  );
}

function SeriesChart({
  title,
  points,
  valueFor,
  formatLabel,
}: {
  title: string;
  points: Array<{ date: string; count: number }>;
  valueFor?: (point: { date: string; count: number }) => number;
  formatLabel?: (date: string) => string;
}) {
  const values = points.map((point) => valueFor?.(point) ?? point.count);
  const maximum = Math.max(...values, 1);

  return (
    <section className="rounded-2xl border border-white/15 bg-white/[0.07] p-5 backdrop-blur-lg">
      <h2 className="font-serif text-xl text-white">{title}</h2>
      {points.length === 0 ? (
        <p className="mt-5 rounded-xl border border-dashed border-white/20 px-4 py-8 text-center text-sm text-white/60">
          No records for this timeframe.
        </p>
      ) : (
        <div className="mt-5 flex min-h-40 items-end gap-2 overflow-x-auto pb-1">
          {points.map((point, index) => {
            const value = values[index];
            const height = value === 0 ? 3 : Math.max(8, (value / maximum) * 120);
            return (
              <div key={point.date} className="group flex min-w-8 flex-1 flex-col items-center justify-end gap-2">
                <span className="text-[10px] tabular-nums text-white/70">{value}</span>
                <div
                  aria-label={`${formatLabel?.(point.date) || point.date}: ${value}`}
                  className="w-full rounded-t-md bg-[#d2b475] transition-colors group-hover:bg-[#f0d79f]"
                  style={{ height }}
                />
                <span className="max-w-14 truncate text-[9px] text-white/50">
                  {formatLabel?.(point.date) || point.date}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

function Pager({
  data,
  onPage,
}: {
  data: AdminPageResult<unknown>;
  onPage: (page: number) => void;
}) {
  const pages = Math.max(1, Math.ceil(data.total / data.pageSize));
  return (
    <div className="flex items-center justify-between gap-4 border-t border-white/10 pt-4 text-xs text-white/65">
      <span>{data.total.toLocaleString()} records · page {data.page} of {pages}</span>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => onPage(data.page - 1)}
          disabled={data.page <= 1}
          className="rounded-lg border border-white/20 px-3 py-2 text-white disabled:opacity-40"
        >
          Previous
        </button>
        <button
          type="button"
          onClick={() => onPage(data.page + 1)}
          disabled={data.page >= pages}
          className="rounded-lg border border-white/20 px-3 py-2 text-white disabled:opacity-40"
        >
          Next
        </button>
      </div>
    </div>
  );
}

export const AdminPage: React.FC = () => {
  const navigate = useNavigate();
  const { logout } = useArtVerse();
  const [section, setSection] = useState<AdminSection>('overview');
  const [timeframe, setTimeframe] = useState<AdminTimeframe>(30);
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [users, setUsers] = useState<AdminPageResult<AdminUserRecord> | null>(null);
  const [content, setContent] = useState<AdminPageResult<AdminContentRecord> | null>(null);
  const [orders, setOrders] = useState<AdminPageResult<AdminOrderRecord> | null>(null);
  const [roleFilter, setRoleFilter] = useState<AdminRoleFilter>('all');
  const [contentKind, setContentKind] = useState<AdminContentKind>('artworks');
  const [contentFilter, setContentFilter] = useState<'all' | 'direct'>('all');
  const [search, setSearch] = useState('');
  const [artistSearch, setArtistSearch] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    artverseApi.fetchAdminOverview(timeframe)
      .then((data) => {
        if (!cancelled) setOverview(data);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Unable to verify administrator access.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [timeframe]);

  useEffect(() => {
    if (section !== 'users' && section !== 'artists') return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    const role = section === 'artists' ? 'artist' : roleFilter;
    const timeout = window.setTimeout(() => {
      artverseApi.fetchAdminUsers({ page, pageSize: 20, role, search })
        .then((data) => {
          if (!cancelled) setUsers(data);
        })
        .catch((err: unknown) => {
          if (!cancelled) setError(err instanceof Error ? err.message : 'Unable to load users.');
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }, 180);
    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [page, roleFilter, search, section]);

  useEffect(() => {
    if (section !== 'content') return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    const timeout = window.setTimeout(() => {
      artverseApi.fetchAdminContent({
        kind: contentKind,
        page,
        pageSize: 16,
        search,
        artistName: artistSearch,
        filter: contentFilter,
      })
        .then((data) => {
          if (!cancelled) setContent(data);
        })
        .catch((err: unknown) => {
          if (!cancelled) setError(err instanceof Error ? err.message : 'Unable to load content.');
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }, 180);
    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [artistSearch, contentFilter, contentKind, page, search, section]);

  useEffect(() => {
    if (section !== 'orders') return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    artverseApi.fetchAdminOrders(page, 20)
      .then((data) => {
        if (!cancelled) setOrders(data);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Unable to load orders.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [page, section]);

  const title = useMemo(
    () => NAV_ITEMS.find((item) => item.id === section)?.label || 'Overview',
    [section]
  );

  const selectSection = (next: AdminSection) => {
    setSection(next);
    setPage(1);
    setSearch('');
    setArtistSearch('');
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  const accessUnavailable = error && !overview && (error.includes('Administrator') || error.includes('authentication') || error.includes('Unauthorized'));
  const signInRequired =
    error?.includes('Missing authentication token') ||
    error?.includes('Invalid or expired access token');

  if (accessUnavailable) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-[#171614] px-4 py-12 text-white">
        <section className="w-full max-w-lg rounded-2xl border border-white/15 bg-white/[0.07] p-7 shadow-2xl backdrop-blur-xl">
          <Link to="/" className="font-serif text-sm tracking-[0.18em] text-white/75">
            ART UNIVERSE
          </Link>
          <p className="mt-8 text-[10px] uppercase tracking-[0.24em] text-[#d6bb7e]">
            Restricted area
          </p>
          <h1 className="mt-2 font-serif text-3xl">Administrator access</h1>
          <p className="mt-3 text-sm leading-relaxed text-white/65">
            {signInRequired
              ? 'Sign in with the Supabase account authorized for administrator access.'
              : 'This account is not authorized for administrator access. Only server-allowlisted Supabase user IDs can view this area.'}
          </p>
          {error && <div className="mt-5"><ErrorNotice message={error} /></div>}
          {signInRequired && (
            <Link
              to="/login"
              state={{ from: { pathname: '/admin' } }}
              className="mt-5 inline-block rounded-lg bg-[#d3b578] px-4 py-2 text-xs font-semibold text-[#211c13]"
            >
              Sign in
            </Link>
          )}
          {error?.includes('not configured') && (
            <p className="mt-4 text-xs text-white/55">
              Configure <code className="text-[#ead39e]">ADMIN_UIDS</code> in the server environment before using the administrator dashboard.
            </p>
          )}
        </section>
      </main>
    );
  }

  return (
    <div className="min-h-[calc(100dvh-4rem)] bg-[#171614] text-white">
      <div className="mx-auto flex min-h-[calc(100dvh-4rem)] max-w-[1600px] flex-col lg:flex-row">
        <aside className="border-b border-white/10 bg-black/20 p-4 backdrop-blur-xl lg:w-64 lg:shrink-0 lg:border-b-0 lg:border-r lg:p-6">
          <Link to="/" className="font-serif text-lg tracking-[0.13em] text-white">
            ART UNIVERSE
          </Link>
          <p className="mt-1 text-[10px] uppercase tracking-[0.2em] text-white/45">Administration</p>
          <nav aria-label="Administrator navigation" className="mt-5 flex gap-2 overflow-x-auto lg:flex-col">
            {NAV_ITEMS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => selectSection(id)}
                aria-current={section === id ? 'page' : undefined}
                className={`flex shrink-0 items-center gap-3 rounded-xl px-3 py-2.5 text-left text-xs transition-colors ${
                  section === id
                    ? 'bg-white/15 text-white'
                    : 'text-white/65 hover:bg-white/8 hover:text-white'
                }`}
              >
                <Icon className="h-4 w-4" />
                {label}
              </button>
            ))}
          </nav>
          <button
            type="button"
            onClick={handleLogout}
            className="mt-5 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-xs text-white/60 hover:bg-white/10 hover:text-white"
          >
            <LogOut className="h-4 w-4" /> Sign out
          </button>
        </aside>

        <main className="min-w-0 flex-1 p-4 sm:p-7 lg:p-10">
          <header className="mb-7 flex flex-wrap items-end justify-between gap-4">
            <div>
              <Link to="/" className="mb-3 inline-flex items-center gap-2 text-xs text-white/55 hover:text-white">
                <ArrowLeft className="h-3.5 w-3.5" /> Public gallery
              </Link>
              <p className="text-[10px] uppercase tracking-[0.24em] text-[#d6bb7e]">Platform administration</p>
              <h1 className="mt-1 font-serif text-3xl font-medium sm:text-4xl">{title}</h1>
            </div>
            {section === 'overview' && (
              <label className="flex items-center gap-3 text-xs text-white/65">
                Timeframe
                <select
                  value={timeframe}
                  onChange={(event) => setTimeframe(event.target.value === 'all' ? 'all' : Number(event.target.value) as 7 | 30 | 90)}
                  className="rounded-lg border border-white/20 bg-[#262420] px-3 py-2 text-white"
                >
                  <option value={7}>Last 7 days</option>
                  <option value={30}>Last 30 days</option>
                  <option value={90}>Last 90 days</option>
                  <option value="all">All time</option>
                </select>
              </label>
            )}
          </header>

          {error && <ErrorNotice message={error} />}
          {accessUnavailable && (
            <div className="mt-4 rounded-2xl border border-white/15 bg-white/[0.06] p-6">
              <h2 className="font-serif text-xl">Admin access unavailable</h2>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/65">
                Sign in with the Supabase account whose user ID is allowlisted on the server. If you are the administrator, configure <code className="text-[#ead39e]">ADMIN_UIDS</code> server-side before access is granted.
              </p>
              <Link to="/login" state={{ from: { pathname: '/admin' } }} className="mt-4 inline-block rounded-lg bg-[#d3b578] px-4 py-2 text-xs font-semibold text-[#211c13]">
                Sign in
              </Link>
            </div>
          )}

          {!accessUnavailable && loading && (
            <p role="status" className="rounded-xl border border-white/10 bg-white/[0.05] p-5 text-sm text-white/65">
              Loading live administrator data…
            </p>
          )}

          {!accessUnavailable && section === 'overview' && overview && (
            <div className="space-y-7">
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                <StatCard label="Registered users" value={overview.counts.users.toLocaleString()} detail="Supabase accounts synced to PostgreSQL" icon={Users} />
                <StatCard label="Artists" value={overview.counts.artists.toLocaleString()} detail="Non-demo artist profiles" icon={Brush} />
                <StatCard label="Collectors" value={overview.counts.collectors.toLocaleString()} detail="Non-demo collector profiles" icon={Users} />
                <StatCard label="Artwork listings" value={overview.counts.artworks.toLocaleString()} detail="Published catalogue artwork records" icon={Image} />
                <StatCard label="Community posts" value={overview.counts.communityPosts.toLocaleString()} detail="Published non-demo posts" icon={Activity} />
                <StatCard label="Purchase intents" value={overview.counts.purchaseIntents.toLocaleString()} detail={`${overview.counts.pendingPaymentIntents} awaiting payment · ${overview.counts.cancelledIntents} cancelled`} icon={CreditCard} />
              </div>

              <div className="grid gap-4 xl:grid-cols-2">
                <SeriesChart title="User registrations" points={overview.series.registrations} formatLabel={(date) => date.slice(5)} />
                <SeriesChart title="Artwork listings over time" points={overview.series.artworks} formatLabel={(date) => date.slice(5)} />
                <SeriesChart title="Community posts over time" points={overview.series.communityPosts} formatLabel={(date) => date.slice(5)} />
                <SeriesChart
                  title="Purchase intents"
                  points={overview.series.purchaseIntents.map((point) => ({ ...point, count: point.intents }))}
                  formatLabel={(date) => date.slice(5)}
                />
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                <section className="rounded-2xl border border-white/15 bg-white/[0.07] p-5">
                  <h2 className="font-serif text-xl">Artist & collector accounts</h2>
                  <div className="mt-4 space-y-4">
                    {overview.series.roleDistribution.map(({ role, count: roleCount }) => {
                      const total = Math.max(1, overview.counts.artists + overview.counts.collectors);
                      return (
                        <div key={role}>
                          <div className="mb-1 flex justify-between text-xs text-white/75">
                            <span>{formatRoleLabel(role)}</span><span>{roleCount.toLocaleString()}</span>
                          </div>
                          <div className="h-2 overflow-hidden rounded-full bg-white/10">
                            <div className="h-full rounded-full bg-[#d3b578]" style={{ width: `${(roleCount / total) * 100}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
                <section className="rounded-2xl border border-white/15 bg-white/[0.07] p-5">
                  <h2 className="font-serif text-xl">Payments</h2>
                  <p className="mt-3 text-sm text-white/70">{overview.payments.message}</p>
                  <p className="mt-2 text-xs text-white/50">
                    Completed purchases cannot be determined from the current order/payment schema. Orders are purchase intents only; none of their states confirms a payment.
                  </p>
                </section>
              </div>
            </div>
          )}

          {(section === 'users' || section === 'artists') && (
            <section className="space-y-4">
              <div className="flex flex-wrap gap-3">
                <label className="relative min-w-56 flex-1">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/45" />
                  <input
                    value={search}
                    onChange={(event) => { setSearch(event.target.value); setPage(1); }}
                    placeholder="Search by name or handle"
                    aria-label="Search by name or handle"
                    className="w-full rounded-xl border border-white/15 bg-white/[0.07] py-2.5 pl-10 pr-3 text-sm text-white placeholder:text-white/40"
                  />
                </label>
                {section === 'users' && (
                  <select
                    value={roleFilter}
                    onChange={(event) => { setRoleFilter(event.target.value as AdminRoleFilter); setPage(1); }}
                    aria-label="Filter users by account type"
                    className="rounded-xl border border-white/15 bg-[#262420] px-3 text-sm text-white"
                  >
                    <option value="all">All account types</option>
                    <option value="artist">Artists</option>
                    <option value="collector">Collectors</option>
                    <option value="art_lover">Art lovers</option>
                  </select>
                )}
              </div>
              {users && (
                <div className="overflow-x-auto rounded-2xl border border-white/15 bg-white/[0.04]">
                  <table className="w-full min-w-[650px] text-left text-sm">
                    <thead className="bg-white/[0.06] text-[10px] uppercase tracking-[0.14em] text-white/55">
                      <tr><th className="px-4 py-3">Name</th><th className="px-4 py-3">Account type</th><th className="px-4 py-3">Registered</th><th className="px-4 py-3 text-right">Artworks</th>{section === 'artists' && <><th className="px-4 py-3 text-right">Available</th><th className="px-4 py-3 text-right">Purchase intents</th></>}<th className="px-4 py-3">Profile</th></tr>
                    </thead>
                    <tbody className="divide-y divide-white/10">
                      {users.records.map((user, index) => (
                        <tr key={`${user.profileId || 'unlinked'}-${index}`} className="text-white/80">
                          <td className="px-4 py-3"><span className="block">{user.fullName || 'Profile not synced'}</span><span className="text-xs text-white/45">{user.handle ? `@${user.handle}` : ''}</span></td>
                          <td className="px-4 py-3">{user.role ? formatRoleLabel(user.role as 'artist' | 'collector' | 'art_lover') : '—'}</td>
                          <td className="px-4 py-3">{formatShortDate(user.createdAt)}</td>
                          <td className="px-4 py-3 text-right tabular-nums">{user.artworkCount}</td>
                          {section === 'artists' && <><td className="px-4 py-3 text-right tabular-nums">{user.availableArtworkCount}</td><td className="px-4 py-3 text-right tabular-nums">{user.purchaseIntentCount}</td></>}
                          <td className="px-4 py-3">{user.profileId && user.role === 'artist' ? <Link className="text-[#ead39e] hover:text-white" to={`/artists/${user.profileId}`}>Open <ArrowRight className="ml-1 inline h-3 w-3" /></Link> : '—'}</td>
                        </tr>
                      ))}
                      {users.records.length === 0 && <tr><td colSpan={section === 'artists' ? 7 : 5} className="px-4 py-8 text-center text-white/55">No matching users.</td></tr>}
                    </tbody>
                  </table>
                </div>
              )}
              {users && <Pager data={users} onPage={setPage} />}
            </section>
          )}

          {section === 'content' && (
            <section className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => { setContentKind('artworks'); setContentFilter('all'); setPage(1); }} className={`rounded-lg px-3 py-2 text-xs ${contentKind === 'artworks' ? 'bg-white/20 text-white' : 'text-white/60 hover:bg-white/10'}`}>Artwork listings</button>
                <button type="button" onClick={() => { setContentKind('community'); setPage(1); }} className={`rounded-lg px-3 py-2 text-xs ${contentKind === 'community' ? 'bg-white/20 text-white' : 'text-white/60 hover:bg-white/10'}`}>Community posts</button>
                {contentKind === 'artworks' && (
                  <select value={contentFilter} onChange={(event) => { setContentFilter(event.target.value as 'all' | 'direct'); setPage(1); }} aria-label="Filter artwork sale status" className="rounded-lg border border-white/15 bg-[#262420] px-3 text-xs text-white">
                    <option value="all">All listings</option><option value="direct">Direct purchase available</option>
                  </select>
                )}
              </div>
              <div className="flex flex-wrap gap-3">
                <label className="relative min-w-56 flex-1">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/45" />
                  <input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Search title or artist name" aria-label="Search content" className="w-full rounded-xl border border-white/15 bg-white/[0.07] py-2.5 pl-10 pr-3 text-sm text-white placeholder:text-white/40" />
                </label>
                <input value={artistSearch} onChange={(event) => { setArtistSearch(event.target.value); setPage(1); }} placeholder="Filter by artist name" aria-label="Filter by artist name" className="min-w-48 rounded-xl border border-white/15 bg-white/[0.07] px-3 py-2.5 text-sm text-white placeholder:text-white/40" />
              </div>
              {content && (
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {content.records.map((record) => (
                    <article key={`${record.kind}-${record.id}`} className="overflow-hidden rounded-2xl border border-white/15 bg-white/[0.06]">
                      {record.imageKey && <div className="h-40"><ArtworkImage imageKey={record.imageKey} alt={record.title || 'Art post'} className="h-full w-full object-cover" /></div>}
                      <div className="p-4">
                        <p className="text-[10px] uppercase tracking-[0.15em] text-[#e3c783]">{record.kind === 'artwork' ? 'Artwork listing' : 'Community post'}</p>
                        <h2 className="mt-1 truncate font-serif text-lg">{record.title || 'Untitled post'}</h2>
                        <p className="mt-1 text-xs text-white/65">{record.artistName} · @{record.artistHandle}</p>
                        <p className="mt-2 text-xs text-white/50">{formatShortDate(record.createdAt)}</p>
                        {record.kind === 'artwork' && (
                          <p className="mt-3 text-xs text-white/75">{record.saleMode === 'negotiation_only' ? 'Offer only' : 'For sale'} · {record.availability} · {record.price !== null ? formatMoney(record.price, record.currency || 'USD') : 'No price'}</p>
                        )}
                        <Link to={record.kind === 'artwork' ? `/artwork/${record.id}` : record.artworkId ? `/artwork/${record.artworkId}` : `/artists/${record.artistId}`} className="mt-4 inline-block text-xs text-[#ead39e] hover:text-white">View public page <ArrowRight className="ml-1 inline h-3 w-3" /></Link>
                      </div>
                    </article>
                  ))}
                  {content.records.length === 0 && <p className="col-span-full rounded-xl border border-dashed border-white/20 p-8 text-center text-sm text-white/55">No content matches these filters.</p>}
                </div>
              )}
              {content && <Pager data={content} onPage={setPage} />}
            </section>
          )}

          {section === 'orders' && (
            <section className="space-y-4">
              <p className="max-w-3xl text-sm leading-relaxed text-white/60">
                These are purchase intents, not completed sales. The current schema has no payment confirmation, deposit, refund, or payout records.
              </p>
              {orders && (
                <div className="overflow-x-auto rounded-2xl border border-white/15 bg-white/[0.04]">
                  <table className="w-full min-w-[700px] text-left text-sm">
                    <thead className="bg-white/[0.06] text-[10px] uppercase tracking-[0.14em] text-white/55">
                      <tr><th className="px-4 py-3">Artwork</th><th className="px-4 py-3">Buyer</th><th className="px-4 py-3">Artist</th><th className="px-4 py-3">Amount</th><th className="px-4 py-3">Intent state</th><th className="px-4 py-3">Created</th></tr>
                    </thead>
                    <tbody className="divide-y divide-white/10">
                      {orders.records.map((order) => (
                        <tr key={order.id} className="text-white/80">
                          <td className="px-4 py-3">{order.artworkTitle}</td><td className="px-4 py-3">{order.buyerName}</td><td className="px-4 py-3">{order.sellerName}</td><td className="px-4 py-3">{formatMoney(order.amount, order.currency)}</td><td className="px-4 py-3">{order.status.replaceAll('_', ' ')}</td><td className="px-4 py-3">{formatShortDate(order.createdAt)}</td>
                        </tr>
                      ))}
                      {orders.records.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-white/55">No purchase intents are recorded.</td></tr>}
                    </tbody>
                  </table>
                </div>
              )}
              {orders && <Pager data={orders} onPage={setPage} />}
            </section>
          )}
        </main>
      </div>
    </div>
  );
};
