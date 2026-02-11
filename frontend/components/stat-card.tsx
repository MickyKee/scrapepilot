import { Minus, TrendingDown, TrendingUp } from 'lucide-react';

import { type StatCard } from '@/lib/types';
import { cn, formatPercent } from '@/lib/utils';

const trendMap = {
  up: TrendingUp,
  down: TrendingDown,
  flat: Minus,
};

const trendStyle = {
  up: 'text-success',
  down: 'text-danger',
  flat: 'text-muted',
};

export function MetricCard({ card, delayMs }: { card: StatCard; delayMs: number }) {
  const Icon = trendMap[card.trend_direction];

  return (
    <article
      className="rounded-2xl border border-border/80 bg-gradient-to-b from-panel to-panel/80 p-5 shadow-panel"
      style={{ animationDelay: `${delayMs}ms` }}
    >
      <p className="text-xs uppercase tracking-[0.13em] text-muted">{card.label}</p>
      <div className="mt-3 flex items-end justify-between gap-3">
        <p className="text-3xl font-semibold tracking-tight text-text">{card.value}</p>
        <div className={cn('flex items-center gap-1 rounded-full border px-2 py-1 text-xs', trendStyle[card.trend_direction])}>
          <Icon className="h-3.5 w-3.5" />
          <span>{formatPercent(card.trend_value)}</span>
        </div>
      </div>
      <p className="mt-2 text-xs text-muted">{card.trend_label}</p>
    </article>
  );
}
