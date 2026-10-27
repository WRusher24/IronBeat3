export function SearchBarSkeleton() {
  return (
    <span
      aria-hidden="true"
      className="block h-12 w-full animate-pulse rounded-2xl border border-border bg-surface/70"
    />
  );
}

export function TrackListSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="space-y-1" aria-hidden="true">
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="flex items-center gap-3 px-1.5 py-1.5">
          <span className="size-12 animate-pulse rounded-xl bg-surface-soft" />
          <span className="flex-1 space-y-2">
            <span className="block h-3 w-2/3 animate-pulse rounded-full bg-surface-soft" />
            <span className="block h-2.5 w-1/3 animate-pulse rounded-full bg-surface-soft" />
          </span>
        </div>
      ))}
    </div>
  );
}

export function CarouselSkeleton() {
  return (
    <div className="flex gap-3" aria-hidden="true">
      {Array.from({ length: 3 }).map((_, index) => (
        <div key={index} className="w-[132px] shrink-0">
          <span className="block aspect-square w-full animate-pulse rounded-2xl bg-surface-soft" />
          <span className="mt-2 block h-3 w-4/5 animate-pulse rounded-full bg-surface-soft" />
          <span className="mt-1.5 block h-2.5 w-1/2 animate-pulse rounded-full bg-surface-soft" />
        </div>
      ))}
    </div>
  );
}
