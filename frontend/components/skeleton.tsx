import { cn } from '@/lib/utils';

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-xl bg-panel/70',
        "before:absolute before:inset-0 before:bg-[linear-gradient(110deg,transparent,oklch(0.94_0.01_250_/_0.09),transparent)] before:bg-[length:180%_100%] before:animate-shimmer",
        className,
      )}
    />
  );
}
