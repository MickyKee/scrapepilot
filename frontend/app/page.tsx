'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  ArrowDownToLine,
  ArrowUpToLine,
  CalendarClock,
  ExternalLink,
  RefreshCcw,
  SlidersHorizontal,
} from 'lucide-react';

import { MetricCard } from '@/components/stat-card';
import { StatusPill } from '@/components/status-pill';
import { Skeleton } from '@/components/skeleton';
import {
  type DomainPoint,
  type HistoryResponse,
  type ItemListResponse,
  type Schedule,
  type ScrapeStatus,
  type SummaryResponse,
  type TrendingResponse,
} from '@/lib/types';
import { apiFetch, cn, formatDate } from '@/lib/utils';

const TOPIC_COLORS = [
  'oklch(0.74 0.19 248)',
  'oklch(0.78 0.17 154)',
  'oklch(0.71 0.2 284)',
  'oklch(0.74 0.18 60)',
];

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8000';

function TooltipContainer({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: string | number; color: string }>; label?: string }) {
  if (!active || !payload || payload.length === 0) {
    return null;
  }

  return (
    <div className="rounded-lg border border-border bg-surface/95 px-3 py-2 shadow-panel backdrop-blur">
      <p className="text-xs text-muted">{label}</p>
      <div className="mt-1 space-y-1">
        {payload.map((entry) => (
          <p key={entry.name} className="text-xs" style={{ color: entry.color }}>
            {entry.name}: <span className="font-semibold">{entry.value}</span>
          </p>
        ))}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [summary, setSummary] = useState<SummaryResponse | null>(null);
  const [trending, setTrending] = useState<TrendingResponse | null>(null);
  const [domains, setDomains] = useState<DomainPoint[]>([]);
  const [status, setStatus] = useState<ScrapeStatus | null>(null);
  const [schedule, setSchedule] = useState<Schedule | null>(null);
  const [history, setHistory] = useState<HistoryResponse | null>(null);
  const [items, setItems] = useState<ItemListResponse | null>(null);

  const [bootLoading, setBootLoading] = useState(true);
  const [tableLoading, setTableLoading] = useState(true);
  const [isRunning, setIsRunning] = useState(false);
  const [scheduleSaving, setScheduleSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [sortBy, setSortBy] = useState<'timestamp' | 'points' | 'comments' | 'title'>('timestamp');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [intervalMinutes, setIntervalMinutes] = useState(15);

  const loadCoreData = useCallback(async () => {
    try {
      const [summaryRes, trendsRes, domainsRes, statusRes, historyRes, scheduleRes] = await Promise.all([
        apiFetch<SummaryResponse>('/analytics/summary'),
        apiFetch<TrendingResponse>('/analytics/trending'),
        apiFetch<DomainPoint[]>('/analytics/domains'),
        apiFetch<ScrapeStatus>('/scrape/status'),
        apiFetch<HistoryResponse>('/history?limit=18'),
        apiFetch<Schedule>('/schedule'),
      ]);

      setSummary(summaryRes);
      setTrending(trendsRes);
      setDomains(domainsRes);
      setStatus(statusRes);
      setHistory(historyRes);
      setSchedule(scheduleRes);
      setIntervalMinutes(scheduleRes.interval_minutes);
      setError(null);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Failed to load dashboard');
    } finally {
      setBootLoading(false);
    }
  }, []);

  const loadItems = useCallback(async () => {
    setTableLoading(true);
    try {
      const params = new URLSearchParams({
        sort_by: sortBy,
        sort_order: sortOrder,
        limit: '40',
        offset: '0',
      });

      if (search.trim()) {
        params.set('search', search.trim());
      }

      if (sourceFilter !== 'all') {
        params.set('source', sourceFilter);
      }

      const response = await apiFetch<ItemListResponse>(`/items?${params.toString()}`);
      setItems(response);
      setError(null);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Failed to load scraped items');
    } finally {
      setTableLoading(false);
    }
  }, [search, sourceFilter, sortBy, sortOrder]);

  useEffect(() => {
    loadCoreData();
  }, [loadCoreData]);

  useEffect(() => {
    const debounce = window.setTimeout(() => setSearch(searchInput), 260);
    return () => window.clearTimeout(debounce);
  }, [searchInput]);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  useEffect(() => {
    const ticker = window.setInterval(async () => {
      try {
        const statusRes = await apiFetch<ScrapeStatus>('/scrape/status');
        setStatus(statusRes);
      } catch {
        // keep the previous state if polling fails
      }
    }, 5000);

    return () => window.clearInterval(ticker);
  }, []);

  const runScrape = async () => {
    setIsRunning(true);
    try {
      await apiFetch('/scrape/run', { method: 'POST' });
      await Promise.all([loadCoreData(), loadItems()]);
    } catch (runError) {
      setError(runError instanceof Error ? runError.message : 'Failed to trigger scrape');
    } finally {
      setIsRunning(false);
    }
  };

  const updateSchedule = async () => {
    setScheduleSaving(true);
    try {
      const updated = await apiFetch<Schedule>('/schedule', {
        method: 'POST',
        body: JSON.stringify({ interval_minutes: intervalMinutes }),
      });
      setSchedule(updated);
      await loadCoreData();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Failed to update schedule');
    } finally {
      setScheduleSaving(false);
    }
  };

  const uniqueDomains = useMemo(() => {
    const values = new Set<string>();
    domains.forEach((domain) => values.add(domain.domain));
    items?.items.forEach((item) => values.add(item.source_domain));
    return Array.from(values).sort((a, b) => a.localeCompare(b));
  }, [domains, items]);

  const handleSort = (column: 'timestamp' | 'points' | 'comments' | 'title') => {
    if (sortBy === column) {
      setSortOrder((prev) => (prev === 'desc' ? 'asc' : 'desc'));
      return;
    }
    setSortBy(column);
    setSortOrder('desc');
  };

  return (
    <main className="relative min-h-dvh pb-10">
      <div className="mx-auto w-full max-w-[1380px] px-4 py-8 sm:px-6 lg:px-10">
        <header className="animate-rise rounded-2xl border border-border/80 bg-panel/70 p-6 shadow-glow backdrop-blur-xl">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-accent">ScrapePilot Analytics</p>
              <h1 className="mt-2 text-balance text-3xl font-semibold tracking-tight text-text sm:text-4xl">
                Scraping intelligence that looks and feels premium.
              </h1>
              <p className="mt-2 max-w-2xl text-pretty text-sm text-muted">
                Live Hacker News extraction pipeline with run history, trend intelligence, and export-ready data.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={runScrape}
                disabled={isRunning || status?.is_running}
                className="inline-flex items-center gap-2 rounded-xl border border-accent/60 bg-accent/15 px-4 py-2 text-sm font-medium text-accent transition hover:bg-accent/25 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <RefreshCcw className={cn('h-4 w-4', (isRunning || status?.is_running) && 'animate-spin')} />
                {isRunning || status?.is_running ? 'Scraping...' : 'Run Scrape'}
              </button>
              <a
                href={`${API_BASE}/export/csv`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-xl border border-border bg-surface/70 px-4 py-2 text-sm text-text transition hover:border-accent/40"
              >
                <ArrowDownToLine className="h-4 w-4" /> Export CSV
              </a>
              <a
                href={`${API_BASE}/export/json`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-xl border border-border bg-surface/70 px-4 py-2 text-sm text-text transition hover:border-accent/40"
              >
                <ArrowDownToLine className="h-4 w-4" /> Export JSON
              </a>
            </div>
          </div>
          <div className="mt-5">
            <StatusPill status={status} />
          </div>
          {error ? <p className="mt-4 text-sm text-danger">{error}</p> : null}
        </header>

        <section className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {bootLoading
            ? Array.from({ length: 4 }).map((_, index) => (
                <Skeleton key={index} className="h-[126px] rounded-2xl" />
              ))
            : summary?.cards.map((card, index) => (
                <div key={card.id} className="animate-rise" style={{ animationDelay: `${index * 90}ms` }}>
                  <MetricCard card={card} delayMs={index * 90} />
                </div>
              ))}
        </section>

        <section className="mt-6 grid grid-cols-1 gap-4 xl:grid-cols-12">
          <div className="animate-rise rounded-2xl border border-border/80 bg-panel/80 p-5 shadow-panel xl:col-span-8" style={{ animationDelay: '90ms' }}>
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-text">Trending Topics Over Time</h2>
                <p className="text-xs text-muted">Top recurring keywords from scraped headlines.</p>
              </div>
            </div>
            <div className="h-[320px]">
              {bootLoading ? (
                <Skeleton className="h-full" />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trending?.points ?? []} margin={{ top: 15, right: 18, left: -8, bottom: 0 }}>
                    <CartesianGrid stroke="oklch(0.35 0.03 260 / 0.25)" strokeDasharray="3 3" />
                    <XAxis dataKey="time" tick={{ fill: 'oklch(0.72 0.02 255)', fontSize: 12 }} axisLine={false} tickLine={false} />
                    <YAxis allowDecimals={false} tick={{ fill: 'oklch(0.72 0.02 255)', fontSize: 12 }} axisLine={false} tickLine={false} />
                    <Tooltip content={<TooltipContainer />} />
                    {(trending?.topics ?? []).map((topic, index) => (
                      <Line
                        key={topic}
                        type="monotone"
                        dataKey={topic}
                        stroke={TOPIC_COLORS[index % TOPIC_COLORS.length]}
                        strokeWidth={2.5}
                        dot={{ r: 2.8, strokeWidth: 0, fill: TOPIC_COLORS[index % TOPIC_COLORS.length] }}
                        activeDot={{ r: 5 }}
                        isAnimationActive
                        animationDuration={750}
                        animationBegin={index * 180}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          <div className="animate-rise rounded-2xl border border-border/80 bg-panel/80 p-5 shadow-panel xl:col-span-4" style={{ animationDelay: '140ms' }}>
            <div>
              <h2 className="text-lg font-semibold text-text">Top Sources</h2>
              <p className="text-xs text-muted">Most active domains in current dataset.</p>
            </div>
            <div className="mt-3 h-[320px]">
              {bootLoading ? (
                <Skeleton className="h-full" />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={domains} layout="vertical" margin={{ top: 8, right: 8, left: 35, bottom: 0 }}>
                    <CartesianGrid stroke="oklch(0.35 0.03 260 / 0.22)" strokeDasharray="3 3" />
                    <XAxis type="number" allowDecimals={false} tick={{ fill: 'oklch(0.72 0.02 255)', fontSize: 12 }} axisLine={false} tickLine={false} />
                    <YAxis
                      dataKey="domain"
                      type="category"
                      width={120}
                      tick={{ fill: 'oklch(0.72 0.02 255)', fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip content={<TooltipContainer />} />
                    <Bar dataKey="count" fill="oklch(0.74 0.19 248 / 0.85)" radius={[6, 6, 6, 6]} isAnimationActive animationDuration={850} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </section>

        <section className="mt-6 grid grid-cols-1 gap-4 xl:grid-cols-12">
          <div className="animate-rise rounded-2xl border border-border/80 bg-panel/80 p-5 shadow-panel xl:col-span-8" style={{ animationDelay: '220ms' }}>
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-text">Scraped Data Table</h2>
                <p className="text-xs text-muted">Search, filter, and sort extracted records.</p>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <input
                  value={searchInput}
                  onChange={(event) => setSearchInput(event.target.value)}
                  placeholder="Search headline..."
                  className="rounded-xl border border-border bg-surface/70 px-3 py-2 text-sm text-text outline-none placeholder:text-muted focus:border-accent/70"
                />
                <select
                  value={sourceFilter}
                  onChange={(event) => setSourceFilter(event.target.value)}
                  className="rounded-xl border border-border bg-surface/70 px-3 py-2 text-sm text-text outline-none focus:border-accent/70"
                >
                  <option value="all">All sources</option>
                  {uniqueDomains.map((domain) => (
                    <option key={domain} value={domain}>
                      {domain}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-4 overflow-hidden rounded-xl border border-border/70">
              <div className="max-h-[410px] overflow-auto">
                <table className="min-w-full divide-y divide-border/60 text-sm">
                  <thead className="sticky top-0 bg-surface/95 backdrop-blur">
                    <tr className="text-xs uppercase tracking-[0.11em] text-muted">
                      <th className="px-4 py-3 text-left">
                        <button type="button" onClick={() => handleSort('title')} className="inline-flex items-center gap-1">
                          Headline <ArrowUpToLine className={cn('h-3.5 w-3.5', sortBy === 'title' && sortOrder === 'asc' && 'text-accent')} />
                        </button>
                      </th>
                      <th className="px-4 py-3 text-left">Domain</th>
                      <th className="px-4 py-3 text-left">
                        <button type="button" onClick={() => handleSort('points')} className="inline-flex items-center gap-1">
                          Points <ArrowUpToLine className={cn('h-3.5 w-3.5', sortBy === 'points' && sortOrder === 'asc' && 'text-accent')} />
                        </button>
                      </th>
                      <th className="px-4 py-3 text-left">
                        <button type="button" onClick={() => handleSort('comments')} className="inline-flex items-center gap-1">
                          Comments <ArrowUpToLine className={cn('h-3.5 w-3.5', sortBy === 'comments' && sortOrder === 'asc' && 'text-accent')} />
                        </button>
                      </th>
                      <th className="px-4 py-3 text-left">
                        <button type="button" onClick={() => handleSort('timestamp')} className="inline-flex items-center gap-1">
                          Timestamp <ArrowUpToLine className={cn('h-3.5 w-3.5', sortBy === 'timestamp' && sortOrder === 'asc' && 'text-accent')} />
                        </button>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/45">
                    {tableLoading
                      ? Array.from({ length: 8 }).map((_, index) => (
                          <tr key={index}>
                            <td colSpan={5} className="px-4 py-2">
                              <Skeleton className="h-10" />
                            </td>
                          </tr>
                        ))
                      : items?.items.map((item) => (
                          <tr key={item.id} className="transition hover:bg-surface/40">
                            <td className="px-4 py-3 text-text">
                              <a
                                href={item.url}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-start gap-1.5 text-pretty hover:text-accent"
                              >
                                <span className="line-clamp-2">{item.title}</span>
                                <ExternalLink className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                              </a>
                            </td>
                            <td className="px-4 py-3 text-muted">{item.source_domain}</td>
                            <td className="px-4 py-3 text-text">{item.points}</td>
                            <td className="px-4 py-3 text-text">{item.comments}</td>
                            <td className="px-4 py-3 text-muted">{formatDate(item.timestamp)}</td>
                          </tr>
                        ))}
                  </tbody>
                </table>
              </div>
            </div>
            <p className="mt-2 text-xs text-muted">Showing {items?.items.length ?? 0} of {items?.total ?? 0} records</p>
          </div>

          <div className="animate-rise space-y-4 xl:col-span-4" style={{ animationDelay: '250ms' }}>
            <article className="rounded-2xl border border-border/80 bg-panel/80 p-5 shadow-panel">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-text">Scrape History</h2>
                  <p className="text-xs text-muted">Success rate: {history?.success_rate.toFixed(1) ?? '0.0'}%</p>
                </div>
                <CalendarClock className="h-5 w-5 text-accent" />
              </div>
              <div className="mt-3 space-y-2">
                {(history?.runs ?? []).slice(0, 7).map((run) => (
                  <div key={run.id} className="rounded-xl border border-border/70 bg-surface/55 px-3 py-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-text">Run #{run.id}</span>
                      <span className={cn('text-xs uppercase tracking-[0.11em]', run.status === 'success' ? 'text-success' : run.status === 'failed' ? 'text-danger' : 'text-muted')}>
                        {run.status}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-muted">{run.item_count} items • {formatDate(run.completed_at)}</p>
                  </div>
                ))}
              </div>
            </article>

            <article className="rounded-2xl border border-border/80 bg-panel/80 p-5 shadow-panel">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-text">Scheduler</h2>
                  <p className="text-xs text-muted">Adjust scrape interval and next run time.</p>
                </div>
                <SlidersHorizontal className="h-5 w-5 text-accent" />
              </div>
              <div className="mt-4 space-y-3">
                <label className="text-xs uppercase tracking-[0.13em] text-muted">Interval (minutes)</label>
                <input
                  type="number"
                  min={1}
                  max={1440}
                  value={intervalMinutes}
                  onChange={(event) => setIntervalMinutes(Number(event.target.value || 15))}
                  className="w-full rounded-xl border border-border bg-surface/70 px-3 py-2 text-sm text-text outline-none focus:border-accent/70"
                />
                <button
                  type="button"
                  onClick={updateSchedule}
                  disabled={scheduleSaving}
                  className="w-full rounded-xl border border-accent/60 bg-accent/15 px-3 py-2 text-sm font-medium text-accent transition hover:bg-accent/25 disabled:opacity-60"
                >
                  {scheduleSaving ? 'Saving...' : 'Update Schedule'}
                </button>
                <p className="text-xs text-muted">Current interval: {schedule?.interval_minutes ?? 15}m</p>
                <p className="text-xs text-muted">Next run: {formatDate(schedule?.next_run_at ?? status?.next_run_at ?? null)}</p>
              </div>
            </article>
          </div>
        </section>
      </div>
    </main>
  );
}
