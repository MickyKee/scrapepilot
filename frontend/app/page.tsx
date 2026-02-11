'use client';

import { useState, useMemo } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import {
  Database,
  Activity,
  Zap,
  Clock,
  ArrowUpRight,
  Search,
  Download,
  Play,
  Radar,
  Calendar,
  LayoutDashboard,
  Briefcase,
  BarChart3,
  Globe,
  Settings,
  BookOpen,
} from 'lucide-react';
import { cn } from '@/lib/utils';

/* ─────────────────────────────────────────────────────────
 * ANIMATION STORYBOARD
 *
 *    0ms   page mount, sidebar visible
 *   80ms   first stat card fades in
 *  140ms   second stat card
 *  200ms   third stat card
 *  260ms   fourth stat card
 *  360ms   chart + jobs section appears
 *  460ms   results table appears
 *  560ms   bottom sections appear
 *  700ms   all settled, interactions active
 * ───────────────────────────────────────────────────────── */

// ═══════════════════════════════════════════════════════════
// DEMO DATA
// ═══════════════════════════════════════════════════════════

const STATS = [
  { label: 'Records Scraped', value: '148,392', change: '+12.3%', positive: true, icon: Database },
  { label: 'Active Jobs', value: '12', change: '+2 this week', positive: true, icon: Activity },
  { label: 'Success Rate', value: '99.2%', change: '+0.3%', positive: true, icon: Zap },
  { label: 'Avg Response', value: '3.2s', change: '-0.4s faster', positive: true, icon: Clock },
];

const VOLUME_DATA = [
  { day: 'Mon', records: 18200 },
  { day: 'Tue', records: 22400 },
  { day: 'Wed', records: 19800 },
  { day: 'Thu', records: 24100 },
  { day: 'Fri', records: 21300 },
  { day: 'Sat', records: 16700 },
  { day: 'Sun', records: 25800 },
];

const JOBS: Array<{
  name: string;
  url: string;
  status: 'running' | 'completed' | 'scheduled';
  lastRun: string;
  records: number;
}> = [
  { name: 'HN Front Page', url: 'news.ycombinator.com', status: 'running', lastRun: '2 min ago', records: 34521 },
  { name: 'Reddit r/programming', url: 'reddit.com', status: 'completed', lastRun: '14 min ago', records: 28903 },
  { name: 'Product Hunt Daily', url: 'producthunt.com', status: 'scheduled', lastRun: '1h ago', records: 12847 },
  { name: 'Dev.to Articles', url: 'dev.to', status: 'completed', lastRun: '22 min ago', records: 41293 },
  { name: 'GitHub Trending', url: 'github.com', status: 'completed', lastRun: '35 min ago', records: 18472 },
  { name: 'TechCrunch Feed', url: 'techcrunch.com', status: 'scheduled', lastRun: '2h ago', records: 12356 },
];

const RESULTS = [
  { id: 1, title: 'Show HN: FastDB — A lightweight database that handles 1M writes/sec', source: 'news.ycombinator.com', points: 342, comments: 127, time: '2h ago' },
  { id: 2, title: 'GPT-5 Benchmarks Show 3x Improvement in Reasoning Tasks', source: 'news.ycombinator.com', points: 891, comments: 453, time: '3h ago' },
  { id: 3, title: 'Why We Migrated from Kubernetes to Bare Metal and Saved $2M/year', source: 'reddit.com', points: 567, comments: 234, time: '3h ago' },
  { id: 4, title: 'Rust 2025 Edition: Everything You Need to Know', source: 'dev.to', points: 234, comments: 89, time: '4h ago' },
  { id: 5, title: 'The State of WebAssembly in 2025: A Comprehensive Survey', source: 'news.ycombinator.com', points: 445, comments: 167, time: '5h ago' },
  { id: 6, title: 'Building a Real-Time Data Pipeline with Kafka and Flink', source: 'dev.to', points: 189, comments: 45, time: '5h ago' },
  { id: 7, title: 'Startup Raises $50M to Reinvent Browser Developer Tools', source: 'techcrunch.com', points: 312, comments: 198, time: '6h ago' },
  { id: 8, title: 'PostgreSQL 18 Preview: Native Columnar Storage Engine', source: 'news.ycombinator.com', points: 678, comments: 234, time: '7h ago' },
  { id: 9, title: 'Ask HN: What Are You Working On This Weekend?', source: 'news.ycombinator.com', points: 156, comments: 342, time: '8h ago' },
  { id: 10, title: 'A Comprehensive Guide to Edge Computing Architecture', source: 'reddit.com', points: 423, comments: 112, time: '9h ago' },
];

const DOMAINS = [
  { domain: 'news.ycombinator.com', count: 34521 },
  { domain: 'reddit.com', count: 28903 },
  { domain: 'dev.to', count: 22847 },
  { domain: 'github.com', count: 18472 },
  { domain: 'techcrunch.com', count: 12356 },
];

const SCHEDULE: Array<{
  name: string;
  interval: string;
  nextRun: string;
  active: boolean;
}> = [
  { name: 'HN Front Page', interval: 'Every 15 min', nextRun: '2:45 PM', active: true },
  { name: 'Reddit r/programming', interval: 'Every 30 min', nextRun: '3:00 PM', active: true },
  { name: 'Product Hunt Daily', interval: 'Daily at 9 AM', nextRun: 'Tomorrow', active: false },
  { name: 'Dev.to Articles', interval: 'Every 20 min', nextRun: '2:50 PM', active: true },
  { name: 'GitHub Trending', interval: 'Every 1 hour', nextRun: '3:30 PM', active: true },
  { name: 'TechCrunch Feed', interval: 'Every 2 hours', nextRun: '4:00 PM', active: false },
];

const NAV = [
  { label: 'Dashboard', icon: LayoutDashboard, active: true },
  { label: 'Jobs', icon: Briefcase, active: false },
  { label: 'Analytics', icon: BarChart3, active: false },
  { label: 'Sources', icon: Globe, active: false },
  { label: 'Schedule', icon: Calendar, active: false },
  { label: 'History', icon: Clock, active: false },
];

const NAV_BOTTOM = [
  { label: 'Settings', icon: Settings },
  { label: 'Docs', icon: BookOpen },
];

const MAX_DOMAIN_COUNT = Math.max(...DOMAINS.map((d) => d.count));

// ═══════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════

const STATUS_STYLES = {
  running: { color: 'bg-emerald-500', pulse: true },
  completed: { color: 'bg-emerald-500', pulse: false },
  scheduled: { color: 'bg-zinc-500', pulse: false },
} as const;

function StatusDot({ status }: { status: keyof typeof STATUS_STYLES }) {
  const s = STATUS_STYLES[status];
  return (
    <span className="relative flex h-2 w-2">
      {s.pulse && (
        <span className={cn('absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping', s.color)} />
      )}
      <span className={cn('relative inline-flex h-2 w-2 rounded-full', s.color)} />
    </span>
  );
}

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value: number }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 shadow-lg">
      <p className="text-[11px] text-[var(--text-muted)]">{label}</p>
      <p className="font-display text-sm font-semibold text-[var(--text)]">
        {payload[0].value.toLocaleString()} records
      </p>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// MAIN DASHBOARD
// ═══════════════════════════════════════════════════════════

export default function Dashboard() {
  const [search, setSearch] = useState('');

  const filteredResults = useMemo(() => {
    if (!search) return RESULTS;
    const q = search.toLowerCase();
    return RESULTS.filter(
      (r) => r.title.toLowerCase().includes(q) || r.source.toLowerCase().includes(q),
    );
  }, [search]);

  return (
    <div className="flex h-dvh bg-[var(--bg)]">
      {/* ── Sidebar ──────────────────────────────── */}
      <aside className="hidden w-[240px] flex-shrink-0 flex-col border-r border-[var(--border)] lg:flex">
        {/* Logo */}
        <div className="flex items-center gap-2.5 px-5 py-5">
          <Radar className="h-5 w-5 text-[var(--accent)]" />
          <span className="font-display text-[15px] font-semibold tracking-tight">
            ScrapePilot
          </span>
        </div>

        {/* Main nav */}
        <nav className="flex-1 space-y-0.5 px-3">
          {NAV.map((item) => (
            <button
              key={item.label}
              type="button"
              className={cn(
                'flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-[13px] transition-colors',
                item.active
                  ? 'bg-[var(--accent-subtle)] font-medium text-[var(--accent)]'
                  : 'text-[var(--text-muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--text)]',
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </button>
          ))}
        </nav>

        {/* Bottom nav */}
        <div className="border-t border-[var(--border)] px-3 py-2 space-y-0.5">
          {NAV_BOTTOM.map((item) => (
            <button
              key={item.label}
              type="button"
              className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-[13px] text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--text)]"
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </button>
          ))}
        </div>

        {/* User */}
        <div className="border-t border-[var(--border)] px-3 py-3">
          <div className="flex items-center gap-3 rounded-md px-2.5 py-1.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-orange-600 text-[10px] font-bold text-black">
              JP
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-medium">John Parker</p>
              <p className="truncate text-[11px] text-[var(--text-muted)]">Pro Plan</p>
            </div>
          </div>
        </div>
      </aside>

      {/* ── Main Content ─────────────────────────── */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top bar */}
        <header className="flex items-center justify-between border-b border-[var(--border)] px-6 py-3">
          {/* Mobile logo */}
          <div className="flex items-center gap-2.5 lg:hidden">
            <Radar className="h-5 w-5 text-[var(--accent)]" />
            <span className="font-display text-[15px] font-semibold">ScrapePilot</span>
          </div>

          {/* Desktop breadcrumb */}
          <div className="hidden items-center gap-3 lg:flex">
            <h1 className="font-display text-[15px] font-semibold">Dashboard</h1>
            <span className="rounded-full bg-[var(--success-subtle)] px-2.5 py-0.5 text-[11px] font-medium text-[var(--success)]">
              3 jobs running
            </span>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="inline-flex items-center gap-1.5 rounded-md bg-[var(--accent)] px-3.5 py-1.5 text-[13px] font-medium text-black transition-colors hover:bg-[var(--accent-hover)]"
            >
              <Play className="h-3.5 w-3.5" />
              Run Now
            </button>
            <button
              type="button"
              className="inline-flex items-center gap-1.5 rounded-md border border-[var(--border)] bg-[var(--surface)] px-3.5 py-1.5 text-[13px] font-medium text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--text)]"
            >
              <Download className="h-3.5 w-3.5" />
              Export
            </button>
          </div>
        </header>

        {/* Scrollable content */}
        <main className="flex-1 overflow-auto">
          <div className="mx-auto max-w-[1200px] space-y-6 px-6 py-6">

            {/* ── Stat Cards ───────────────────────── */}
            <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              {STATS.map((stat, i) => {
                const Icon = stat.icon;
                return (
                  <div
                    key={stat.label}
                    className="animate-fade-in-up rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5 transition-colors hover:border-[var(--text-muted)]/20"
                    style={{ animationDelay: `${80 + i * 60}ms` }}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-medium uppercase tracking-wider text-[var(--text-muted)]">
                        {stat.label}
                      </span>
                      <Icon className="h-4 w-4 text-[var(--text-muted)]" />
                    </div>
                    <p className="mt-2 font-display text-2xl font-semibold tracking-tight">
                      {stat.value}
                    </p>
                    <div className="mt-1 flex items-center gap-1">
                      <ArrowUpRight className="h-3 w-3 text-[var(--success)]" />
                      <span className="text-[12px] text-[var(--success)]">{stat.change}</span>
                    </div>
                  </div>
                );
              })}
            </section>

            {/* ── Chart + Jobs ──────────────────────── */}
            <section
              className="animate-fade-in-up grid gap-4 lg:grid-cols-3"
              style={{ animationDelay: '360ms' }}
            >
              {/* Volume Chart */}
              <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5 lg:col-span-2">
                <div className="mb-5 flex items-center justify-between">
                  <div>
                    <h2 className="font-display text-[13px] font-semibold">Scraping Volume</h2>
                    <p className="mt-0.5 text-[12px] text-[var(--text-muted)]">Records collected over 7 days</p>
                  </div>
                  <span className="rounded-md bg-[var(--accent-subtle)] px-2 py-1 text-[11px] font-medium text-[var(--accent)]">
                    +15.2% this week
                  </span>
                </div>
                <div className="h-52">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={VOLUME_DATA} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="volumeGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.2} />
                          <stop offset="100%" stopColor="var(--accent)" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <XAxis
                        dataKey="day"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
                        dy={8}
                      />
                      <YAxis hide />
                      <Tooltip content={<ChartTooltip />} cursor={false} />
                      <Area
                        type="monotone"
                        dataKey="records"
                        stroke="var(--accent)"
                        strokeWidth={2}
                        fill="url(#volumeGrad)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Active Jobs */}
              <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5">
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="font-display text-[13px] font-semibold">Active Jobs</h2>
                  <span className="text-[12px] text-[var(--text-muted)]">{JOBS.length} total</span>
                </div>
                <div className="space-y-0.5">
                  {JOBS.map((job) => (
                    <div
                      key={job.name}
                      className="flex items-center gap-3 rounded-md px-3 py-2.5 transition-colors hover:bg-[var(--surface-hover)]"
                    >
                      <StatusDot status={job.status} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13px] font-medium">{job.name}</p>
                        <p className="text-[11px] text-[var(--text-muted)]">{job.lastRun}</p>
                      </div>
                      <span className="font-mono text-[11px] text-[var(--text-muted)]">
                        {job.records.toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* ── Results Table ─────────────────────── */}
            <section
              className="animate-fade-in-up rounded-lg border border-[var(--border)] bg-[var(--surface)]"
              style={{ animationDelay: '460ms' }}
            >
              <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-3.5">
                <h2 className="font-display text-[13px] font-semibold">Recent Results</h2>
                <div className="flex items-center gap-2.5">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--text-muted)]" />
                    <input
                      type="text"
                      placeholder="Search results..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="h-8 w-52 rounded-md border border-[var(--border)] bg-[var(--bg)] pl-8 pr-3 text-[12px] text-[var(--text)] placeholder:text-[var(--text-muted)] focus:border-[var(--accent)] focus:outline-none transition-colors"
                    />
                  </div>
                  <button
                    type="button"
                    className="inline-flex items-center gap-1.5 rounded-md border border-[var(--border)] px-2.5 py-1.5 text-[12px] text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--text)]"
                  >
                    <Download className="h-3 w-3" />
                    CSV
                  </button>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-[var(--border)]">
                      <th className="px-5 py-2.5 text-left text-[11px] font-medium uppercase tracking-wider text-[var(--text-muted)]">Title</th>
                      <th className="px-5 py-2.5 text-left text-[11px] font-medium uppercase tracking-wider text-[var(--text-muted)]">Source</th>
                      <th className="px-5 py-2.5 text-right text-[11px] font-medium uppercase tracking-wider text-[var(--text-muted)]">Points</th>
                      <th className="px-5 py-2.5 text-right text-[11px] font-medium uppercase tracking-wider text-[var(--text-muted)]">Comments</th>
                      <th className="px-5 py-2.5 text-right text-[11px] font-medium uppercase tracking-wider text-[var(--text-muted)]">Time</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border-subtle)]">
                    {filteredResults.map((row) => (
                      <tr key={row.id} className="transition-colors hover:bg-[var(--surface-hover)]">
                        <td className="max-w-md px-5 py-3">
                          <span className="line-clamp-1 text-[13px] font-medium">{row.title}</span>
                        </td>
                        <td className="whitespace-nowrap px-5 py-3 text-[12px] text-[var(--text-muted)]">
                          {row.source}
                        </td>
                        <td className="whitespace-nowrap px-5 py-3 text-right font-mono text-[12px] text-[var(--text-secondary)]">
                          {row.points}
                        </td>
                        <td className="whitespace-nowrap px-5 py-3 text-right font-mono text-[12px] text-[var(--text-secondary)]">
                          {row.comments}
                        </td>
                        <td className="whitespace-nowrap px-5 py-3 text-right text-[12px] text-[var(--text-muted)]">
                          {row.time}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex items-center justify-between border-t border-[var(--border)] px-5 py-2.5">
                <span className="text-[11px] text-[var(--text-muted)]">
                  Showing {filteredResults.length} of {RESULTS.length} results
                </span>
                <span className="text-[11px] text-[var(--text-muted)]">
                  Updated 2 minutes ago
                </span>
              </div>
            </section>

            {/* ── Bottom Row: Sources + Schedule ────── */}
            <section
              className="animate-fade-in-up grid gap-4 lg:grid-cols-2"
              style={{ animationDelay: '560ms' }}
            >
              {/* Top Sources */}
              <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5">
                <h2 className="mb-4 font-display text-[13px] font-semibold">Top Sources</h2>
                <div className="space-y-3.5">
                  {DOMAINS.map((d) => (
                    <div key={d.domain} className="flex items-center gap-4">
                      <span className="w-40 truncate text-[12px] text-[var(--text-secondary)]">
                        {d.domain}
                      </span>
                      <div className="h-1.5 flex-1 rounded-full bg-[var(--border)]">
                        <div
                          className="h-full rounded-full bg-[var(--accent)] transition-all"
                          style={{ width: `${(d.count / MAX_DOMAIN_COUNT) * 100}%` }}
                        />
                      </div>
                      <span className="w-14 text-right font-mono text-[11px] text-[var(--text-muted)]">
                        {(d.count / 1000).toFixed(1)}k
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Scheduled Runs */}
              <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)]">
                <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-3.5">
                  <h2 className="font-display text-[13px] font-semibold">Scheduled Runs</h2>
                  <Calendar className="h-4 w-4 text-[var(--text-muted)]" />
                </div>
                <div className="divide-y divide-[var(--border-subtle)]">
                  {SCHEDULE.map((s) => (
                    <div
                      key={s.name}
                      className="flex items-center justify-between px-5 py-3 transition-colors hover:bg-[var(--surface-hover)]"
                    >
                      <div>
                        <p className="text-[13px] font-medium">{s.name}</p>
                        <p className="text-[11px] text-[var(--text-muted)]">{s.interval}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-[12px] text-[var(--text-muted)]">
                          Next: {s.nextRun}
                        </span>
                        <span
                          className={cn(
                            'inline-flex h-5 items-center rounded-full px-2 text-[10px] font-medium',
                            s.active
                              ? 'bg-[var(--success-subtle)] text-[var(--success)]'
                              : 'bg-zinc-500/10 text-zinc-500',
                          )}
                        >
                          {s.active ? 'Active' : 'Paused'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}
