import { Activity, Radio, Wifi } from 'lucide-react';

import { type ScrapeStatus } from '@/lib/types';
import { cn, formatDate } from '@/lib/utils';

export function StatusPill({ status }: { status: ScrapeStatus | null }) {
  const running = status?.is_running ?? false;

  return (
    <div className="flex flex-wrap items-center gap-4 rounded-lg border border-border/50 bg-surface/40 px-4 py-2.5 font-mono text-xs backdrop-blur-sm">
      <span className="inline-flex items-center gap-2 text-text">
        {running ? (
          <Radio className={cn('h-3.5 w-3.5 text-accent', running && 'animate-pulseSoft')} />
        ) : (
          <Wifi className="h-3.5 w-3.5 text-muted" />
        )}
        <span className={cn(running ? 'text-accent neon-text' : 'text-muted')}>
          {running ? 'LIVE' : 'IDLE'}
        </span>
        <span className={cn('inline-block h-1.5 w-1.5 rounded-full', running ? 'bg-accent animate-pulseSoft shadow-neon' : 'bg-muted/50')} />
      </span>

      <span className="h-3 w-px bg-border/60" />

      <span className="inline-flex items-center gap-1.5 text-muted">
        <Activity className="h-3 w-3" />
        <span className="text-muted/70">last:</span>
        <span className="data-mono text-text/70">{formatDate(status?.last_run_completed_at ?? null)}</span>
      </span>

      <span className="h-3 w-px bg-border/60" />

      <span className="inline-flex items-center gap-1.5 text-muted">
        <span className="text-muted/70">next:</span>
        <span className="data-mono text-text/70">{formatDate(status?.next_run_at ?? null)}</span>
      </span>
    </div>
  );
}
