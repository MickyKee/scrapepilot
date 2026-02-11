import { cn } from '@/lib/utils';

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-lg border border-border/30 bg-panel/50',
        'before:absolute before:inset-0 before:bg-[linear-gradient(110deg,transparent,oklch(0.78_0.16_195_/_0.06),transparent)] before:bg-[length:200%_100%] before:animate-shimmer',
        className,
      )}
    />
  );
}
