import { Activity } from 'lucide-react';

import { type ScrapeStatus } from '@/lib/types';
import { formatDate } from '@/lib/utils';

export function StatusPill({ status }: { status: ScrapeStatus | null }) {
  const running = status?.is_running ?? false;
  const label = running ? 'Scraping live now' : 'Idle';

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border/80 bg-panel/70 px-4 py-2 text-sm shadow-panel">
      <span className="inline-flex items-center gap-2 text-text">
        <span className={`h-2.5 w-2.5 rounded-full ${running ? 'bg-accent animate-pulseSoft' : 'bg-muted'}`} />
        {label}
      </span>
      <span className="inline-flex items-center gap-1 text-muted">
        <Activity className="h-3.5 w-3.5" />
        Last run: {formatDate(status?.last_run_completed_at ?? null)}
      </span>
      <span className="text-muted">Next run: {formatDate(status?.next_run_at ?? null)}</span>
    </div>
  );
}
