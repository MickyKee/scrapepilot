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
  CalendarClock,
  ChevronDown,
  ChevronUp,
  Database,
  ExternalLink,
  Play,
  RefreshCcw,
  Search,
  SlidersHorizontal,
  Terminal,
  Zap,
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

/* ─────────────────────────────────────────────────────────
 * ANIMATION STORYBOARD — Dashboard Entrance Sequence
 *
 *    0ms   page mount, grid overlay fades in
 *   60ms   header rises into view, glow-top reveals
 *  140ms   metric cards stagger in (4x, 80ms apart)
 *  460ms   signal feed + source map charts rise
 *  600ms   data table + sidebar panels appear
 *  800ms   all settle — hover interactions active
 * ───────────────────────────────────────────────────────── */
const TIMING = {
  header:     0,
  metrics:    80,     // stagger per card
  charts:     80,     // after metrics row
  chartRight: 130,    // source map offset
  table:      200,    // data feed
  sidebar:    240,    // history + scheduler
} as const;

const TOPIC_COLORS = [
  'oklch(0.78 0.16 195)',
  'oklch(0.80 0.19 150)',
  'oklch(0.72 0.20 290)',
  'oklch(0.78 0.15 75)',
];

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8000';

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: string | number; color: string }>; label?: string }) {
  if (!active || !payload || payload.length === 0) {
    return null;
  }

  return (
    <div className="rounded-lg border border-accent/20 bg-surface/95 px-3 py-2 shadow-glow-sm backdrop-blur-md">
      <p className="font-mono text-[10px] uppercase tracking-wider text-accent/70">{label}</p>
      <div className="mt-1 space-y-0.5">
        {payload.map((entry) => (
          <p key={entry.name} className="flex items-center gap-2 text-xs" style={{ color: entry.color }}>
            <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: entry.color, boxShadow: `0 0 6px ${entry.color}` }} />
            <span className="text-muted">{entry.name}</span>
            <span className="data-mono ml-auto font-semibold">{entry.value}</span>
          </p>
        ))}
      </div>
    </div>
  );
}

function SectionHeader({ icon: Icon, title, subtitle }: { icon: React.ElementType; title: string; subtitle: string }) {
  return (
    <div className="mb-4 flex items-start gap-3">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-accent/20 bg-accent/5">
        <Icon className="h-4 w-4 text-accent" />
      </div>
      <div>
        <h2 className="font-display text-base font-semibold tracking-tight text-text">{title}</h2>
        <p className="section-label mt-0.5">{subtitle}</p>
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

  const SortIcon = ({ column }: { column: string }) => {
    if (sortBy !== column) return <ChevronDown className="h-3 w-3 text-muted/40" />;
    return sortOrder === 'asc'
      ? <ChevronUp className="h-3 w-3 text-accent" />
      : <ChevronDown className="h-3 w-3 text-accent" />;
  };

  return (
    <main className="relative min-h-dvh pb-12">
      <div className="relative z-10 mx-auto w-full max-w-[1440px] px-4 py-6 sm:px-6 lg:px-10">

        {/* ═══ HEADER ═══ */}
        <header className="animate-rise cyber-panel glow-top overflow-hidden rounded-lg border border-border/50 bg-panel/60 p-6 shadow-glow backdrop-blur-xl">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-md border border-accent/30 bg-accent/10 shadow-neon">
                  <Terminal className="h-5 w-5 text-accent" />
                </div>
                <div>
                  <h1 className="font-display text-2xl font-bold tracking-tight text-text sm:text-3xl">
                    ScrapePilot
                  </h1>
                  <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-accent/60">
                    command center v1.0
                  </p>
                </div>
              </div>
              <p className="mt-3 max-w-xl text-pretty text-sm text-muted">
                Real-time extraction pipeline with trend intelligence, source analytics, and export-ready data feeds.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={runScrape}
                disabled={isRunning || status?.is_running}
                className={cn(
                  'group inline-flex items-center gap-2 rounded-lg border px-4 py-2.5 font-mono text-xs font-medium uppercase tracking-wider transition-all duration-200',
                  isRunning || status?.is_running
                    ? 'border-accent/40 bg-accent/10 text-accent shadow-neon'
                    : 'border-accent/50 bg-accent/10 text-accent hover:bg-accent/20 hover:shadow-neon',
                  'disabled:cursor-not-allowed'
                )}
              >
                {isRunning || status?.is_running ? (
                  <RefreshCcw className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Play className="h-3.5 w-3.5" />
                )}
                {isRunning || status?.is_running ? 'Scraping...' : 'Run Scrape'}
              </button>

              <div className="flex items-center gap-1">
                <a
                  href={`${API_BASE}/export/csv`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border/50 bg-surface/40 px-3 py-2.5 font-mono text-[11px] uppercase tracking-wider text-muted transition hover:border-accent/30 hover:text-text"
                >
                  <ArrowDownToLine className="h-3 w-3" /> CSV
                </a>
                <a
                  href={`${API_BASE}/export/json`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border/50 bg-surface/40 px-3 py-2.5 font-mono text-[11px] uppercase tracking-wider text-muted transition hover:border-accent/30 hover:text-text"
                >
                  <ArrowDownToLine className="h-3 w-3" /> JSON
                </a>
              </div>
            </div>
          </div>

          <div className="mt-5">
            <StatusPill status={status} />
          </div>
          {error ? (
            <div className="mt-4 rounded-md border border-danger/30 bg-danger/5 px-3 py-2">
              <p className="font-mono text-xs text-danger">{error}</p>
            </div>
          ) : null}
        </header>

        {/* ═══ METRICS ═══ */}
        <section className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4" aria-label="Key metrics">
          {bootLoading
            ? Array.from({ length: 4 }).map((_, index) => (
                <Skeleton key={index} className="h-[130px] rounded-lg" />
              ))
            : summary?.cards.map((card, index) => (
                <div key={card.id} className="animate-rise" style={{ animationDelay: `${index * 80}ms` }}>
                  <MetricCard card={card} delayMs={index * 80} />
                </div>
              ))}
        </section>

        {/* ═══ CHARTS ROW ═══ */}
        <section className="mt-5 grid grid-cols-1 gap-3 xl:grid-cols-12" aria-label="Analytics charts">
          {/* Trending Topics */}
          <div
            className="animate-rise cyber-panel glow-top overflow-hidden rounded-lg border border-border/50 bg-panel/60 p-5 shadow-panel backdrop-blur-sm xl:col-span-8"
            style={{ animationDelay: '80ms' }}
          >
            <SectionHeader icon={Zap} title="Signal Feed" subtitle="trending keywords over time" />
            <div className="h-[300px]">
              {bootLoading ? (
                <Skeleton className="h-full" />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trending?.points ?? []} margin={{ top: 10, right: 16, left: -12, bottom: 0 }}>
                    <CartesianGrid stroke="oklch(0.24 0.025 220 / 0.4)" strokeDasharray="4 8" />
                    <XAxis
                      dataKey="time"
                      tick={{ fill: 'oklch(0.48 0.02 220)', fontSize: 10, fontFamily: 'var(--font-mono)' }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      allowDecimals={false}
                      tick={{ fill: 'oklch(0.48 0.02 220)', fontSize: 10, fontFamily: 'var(--font-mono)' }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip content={<ChartTooltip />} />
                    {(trending?.topics ?? []).map((topic, index) => (
                      <Line
                        key={topic}
                        type="monotone"
                        dataKey={topic}
                        stroke={TOPIC_COLORS[index % TOPIC_COLORS.length]}
                        strokeWidth={2}
                        dot={{ r: 2, strokeWidth: 0, fill: TOPIC_COLORS[index % TOPIC_COLORS.length] }}
                        activeDot={{ r: 5, strokeWidth: 2, stroke: 'oklch(0.09 0.015 220)' }}
                        isAnimationActive
                        animationDuration={800}
                        animationBegin={index * 150}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Top Sources */}
          <div
            className="animate-rise cyber-panel glow-top overflow-hidden rounded-lg border border-border/50 bg-panel/60 p-5 shadow-panel backdrop-blur-sm xl:col-span-4"
            style={{ animationDelay: '130ms' }}
          >
            <SectionHeader icon={Database} title="Source Map" subtitle="active domain distribution" />
            <div className="h-[300px]">
              {bootLoading ? (
                <Skeleton className="h-full" />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={domains} layout="vertical" margin={{ top: 4, right: 8, left: 30, bottom: 0 }}>
                    <CartesianGrid stroke="oklch(0.24 0.025 220 / 0.3)" strokeDasharray="4 8" horizontal={false} />
                    <XAxis
                      type="number"
                      allowDecimals={false}
                      tick={{ fill: 'oklch(0.48 0.02 220)', fontSize: 10, fontFamily: 'var(--font-mono)' }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      dataKey="domain"
                      type="category"
                      width={110}
                      tick={{ fill: 'oklch(0.48 0.02 220)', fontSize: 10, fontFamily: 'var(--font-mono)' }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip content={<ChartTooltip />} />
                    <Bar
                      dataKey="count"
                      fill="oklch(0.78 0.16 195 / 0.7)"
                      radius={[0, 4, 4, 0]}
                      isAnimationActive
                      animationDuration={900}
                    />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </section>

        {/* ═══ DATA TABLE + SIDEBAR ═══ */}
        <section className="mt-5 grid grid-cols-1 gap-3 xl:grid-cols-12" aria-label="Data and controls">
          {/* Data Table */}
          <div
            className="animate-rise cyber-panel glow-top overflow-hidden rounded-lg border border-border/50 bg-panel/60 p-5 shadow-panel backdrop-blur-sm xl:col-span-8"
            style={{ animationDelay: '200ms' }}
          >
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <SectionHeader icon={Terminal} title="Data Feed" subtitle="extracted records" />
              <div className="flex flex-col gap-2 sm:flex-row">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted/50" />
                  <input
                    value={searchInput}
                    onChange={(event) => setSearchInput(event.target.value)}
                    placeholder="grep headline..."
                    className="w-full rounded-lg border border-border/50 bg-surface/50 py-2 pl-9 pr-3 font-mono text-xs text-text outline-none placeholder:text-muted/40 focus:border-accent/50 focus:shadow-glow-sm sm:w-[200px]"
                  />
                </div>
                <select
                  value={sourceFilter}
                  onChange={(event) => setSourceFilter(event.target.value)}
                  className="rounded-lg border border-border/50 bg-surface/50 px-3 py-2 font-mono text-xs text-text outline-none focus:border-accent/50"
                >
                  <option value="all">all sources</option>
                  {uniqueDomains.map((domain) => (
                    <option key={domain} value={domain}>
                      {domain}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-4 overflow-hidden rounded-lg border border-border/40">
              <div className="max-h-[420px] overflow-auto">
                <table className="min-w-full divide-y divide-border/30 text-xs">
                  <thead className="sticky top-0 z-10 bg-surface/95 backdrop-blur-md">
                    <tr className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted/70">
                      <th className="px-4 py-3 text-left">
                        <button type="button" onClick={() => handleSort('title')} className="inline-flex items-center gap-1 transition hover:text-accent">
                          Headline <SortIcon column="title" />
                        </button>
                      </th>
                      <th className="px-3 py-3 text-left">Source</th>
                      <th className="px-3 py-3 text-right">
                        <button type="button" onClick={() => handleSort('points')} className="inline-flex items-center gap-1 transition hover:text-accent">
                          Pts <SortIcon column="points" />
                        </button>
                      </th>
                      <th className="px-3 py-3 text-right">
                        <button type="button" onClick={() => handleSort('comments')} className="inline-flex items-center gap-1 transition hover:text-accent">
                          Cmt <SortIcon column="comments" />
                        </button>
                      </th>
                      <th className="px-4 py-3 text-right">
                        <button type="button" onClick={() => handleSort('timestamp')} className="inline-flex items-center gap-1 transition hover:text-accent">
                          Time <SortIcon column="timestamp" />
                        </button>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/20">
                    {tableLoading
                      ? Array.from({ length: 8 }).map((_, index) => (
                          <tr key={index}>
                            <td colSpan={5} className="px-4 py-2">
                              <Skeleton className="h-9" />
                            </td>
                          </tr>
                        ))
                      : items?.items.map((item) => (
                          <tr key={item.id} className="group transition-colors hover:bg-accent/[0.03]">
                            <td className="px-4 py-2.5">
                              <a
                                href={item.url}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-start gap-1.5 text-pretty text-text transition hover:text-accent"
                              >
                                <span className="line-clamp-2 text-[13px] leading-snug">{item.title}</span>
                                <ExternalLink className="mt-0.5 h-3 w-3 shrink-0 text-muted/30 transition group-hover:text-accent/50" />
                              </a>
                            </td>
                            <td className="px-3 py-2.5">
                              <span className="data-mono text-muted/70">{item.source_domain}</span>
                            </td>
                            <td className="px-3 py-2.5 text-right">
                              <span className="data-mono text-accent/80">{item.points}</span>
                            </td>
                            <td className="px-3 py-2.5 text-right">
                              <span className="data-mono text-text/60">{item.comments}</span>
                            </td>
                            <td className="px-4 py-2.5 text-right">
                              <span className="data-mono text-muted/60">{formatDate(item.timestamp)}</span>
                            </td>
                          </tr>
                        ))}
                  </tbody>
                </table>
              </div>
            </div>
            <p className="mt-2 font-mono text-[10px] uppercase tracking-wider text-muted/50">
              {items?.items.length ?? 0} / {items?.total ?? 0} records loaded
            </p>
          </div>

          {/* Sidebar: History + Scheduler */}
          <div className="animate-rise space-y-3 xl:col-span-4" style={{ animationDelay: '240ms' }}>
            {/* Run History */}
            <article className="cyber-panel glow-top overflow-hidden rounded-lg border border-border/50 bg-panel/60 p-5 shadow-panel backdrop-blur-sm">
              <div className="flex items-center justify-between gap-3">
                <SectionHeader icon={CalendarClock} title="Run History" subtitle="pipeline execution log" />
              </div>

              <div className="mb-3 flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <span className="inline-block h-2 w-2 rounded-full bg-success shadow-neon-green" />
                  <span className="font-mono text-[10px] uppercase tracking-wider text-success">
                    {history?.success_rate.toFixed(0) ?? '0'}% pass
                  </span>
                </div>
                <span className="h-3 w-px bg-border/40" />
                <span className="font-mono text-[10px] text-muted/50">
                  {history?.runs.length ?? 0} runs
                </span>
              </div>

              <div className="space-y-1.5">
                {(history?.runs ?? []).slice(0, 7).map((run) => (
                  <div key={run.id} className="group flex items-center gap-3 rounded-md border border-border/30 bg-surface/30 px-3 py-2 transition hover:border-accent/20">
                    <span className={cn(
                      'inline-block h-1.5 w-1.5 rounded-full',
                      run.status === 'success' ? 'bg-success shadow-neon-green' : run.status === 'failed' ? 'bg-danger shadow-neon-danger' : 'bg-muted/40'
                    )} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <span className="data-mono text-xs text-text/80">#{run.id}</span>
                        <span className={cn(
                          'data-mono text-[10px] uppercase tracking-wider',
                          run.status === 'success' ? 'text-success' : run.status === 'failed' ? 'text-danger' : 'text-muted'
                        )}>
                          {run.status}
                        </span>
                      </div>
                      <p className="data-mono mt-0.5 text-[10px] text-muted/50">
                        {run.item_count} items &middot; {formatDate(run.completed_at)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </article>

            {/* Scheduler */}
            <article className="cyber-panel glow-top overflow-hidden rounded-lg border border-border/50 bg-panel/60 p-5 shadow-panel backdrop-blur-sm">
              <SectionHeader icon={SlidersHorizontal} title="Scheduler" subtitle="automation config" />

              <div className="space-y-3">
                <div>
                  <label className="mb-1.5 block font-mono text-[10px] uppercase tracking-[0.15em] text-muted/60">
                    Interval (minutes)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={1440}
                    value={intervalMinutes}
                    onChange={(event) => setIntervalMinutes(Number(event.target.value || 15))}
                    className="data-mono w-full rounded-lg border border-border/50 bg-surface/40 px-3 py-2 text-sm text-text outline-none transition focus:border-accent/50 focus:shadow-glow-sm"
                  />
                </div>
                <button
                  type="button"
                  onClick={updateSchedule}
                  disabled={scheduleSaving}
                  className="w-full rounded-lg border border-accent/40 bg-accent/10 px-3 py-2 font-mono text-xs font-medium uppercase tracking-wider text-accent transition hover:bg-accent/20 hover:shadow-neon disabled:opacity-50"
                >
                  {scheduleSaving ? 'Saving...' : 'Update Schedule'}
                </button>
                <div className="space-y-1 rounded-md border border-border/30 bg-surface/20 p-2.5">
                  <p className="flex items-center justify-between">
                    <span className="font-mono text-[10px] text-muted/50">current</span>
                    <span className="data-mono text-xs text-text/70">{schedule?.interval_minutes ?? 15}m</span>
                  </p>
                  <p className="flex items-center justify-between">
                    <span className="font-mono text-[10px] text-muted/50">next_run</span>
                    <span className="data-mono text-xs text-text/70">{formatDate(schedule?.next_run_at ?? status?.next_run_at ?? null)}</span>
                  </p>
                </div>
              </div>
            </article>
          </div>
        </section>

        {/* ═══ FOOTER ═══ */}
        <footer className="mt-8 flex items-center justify-center gap-2 text-center font-mono text-[10px] uppercase tracking-[0.25em] text-muted/30">
          <span className="inline-block h-px w-8 bg-border/30" />
          ScrapePilot // Built with Next.js + FastAPI
          <span className="inline-block h-px w-8 bg-border/30" />
        </footer>
      </div>
    </main>
  );
}
