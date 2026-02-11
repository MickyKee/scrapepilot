import { Minus, TrendingDown, TrendingUp } from 'lucide-react';

import { type StatCard } from '@/lib/types';
import { cn, formatPercent } from '@/lib/utils';

const trendMap = {
  up: TrendingUp,
  down: TrendingDown,
  flat: Minus,
};

const trendStyle = {
  up: 'text-success border-success/30 bg-success/5',
  down: 'text-danger border-danger/30 bg-danger/5',
  flat: 'text-muted border-border/50 bg-surface/30',
};

export function MetricCard({ card, delayMs }: { card: StatCard; delayMs: number }) {
  const Icon = trendMap[card.trend_direction];

  return (
    <article
      className="cyber-panel glow-top group relative overflow-hidden rounded-lg border border-border/60 bg-gradient-to-b from-panel/90 to-surface/60 p-5 shadow-panel transition-all duration-300 hover:border-accent/40 hover:shadow-glow-sm"
      style={{ animationDelay: `${delayMs}ms` }}
    >
      <div className="absolute inset-0 overflow-hidden opacity-0 transition-opacity duration-500 group-hover:opacity-100">
        <div className="absolute -top-full left-0 h-full w-full bg-gradient-to-b from-accent/5 to-transparent animate-scan" />
      </div>

      <p className="section-label relative z-10">{card.label}</p>
      <div className="relative z-10 mt-3 flex items-end justify-between gap-3">
        <p className="data-mono neon-text text-3xl font-bold tracking-tight text-text">{card.value}</p>
        <div className={cn('flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-medium', trendStyle[card.trend_direction])}>
          <Icon className="h-3.5 w-3.5" />
          <span className="data-mono">{formatPercent(card.trend_value)}</span>
        </div>
      </div>
      <p className="relative z-10 mt-2 text-xs text-muted">{card.trend_label}</p>
    </article>
  );
}
