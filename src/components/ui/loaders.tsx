import { cn } from "@/lib/cn";

export function Skeleton({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "block animate-pulse rounded-xl bg-surface-soft",
        className,
      )}
    />
  );
}

export function Equalizer({ className }: { className?: string }) {
  return (
    <span
      className={cn("flex h-4 items-end gap-[2px]", className)}
      aria-hidden="true"
    >
      <span className="eq-bar h-full w-[3px] rounded-full bg-accent [animation-delay:-0.2s]" />
      <span className="eq-bar h-full w-[3px] rounded-full bg-accent [animation-delay:-0.55s]" />
      <span className="eq-bar h-full w-[3px] rounded-full bg-accent [animation-delay:-0.35s]" />
    </span>
  );
}

export function Spinner({ className }: { className?: string }) {
  return (
    <span
      role="status"
      aria-label="Loading"
      className={cn(
        "inline-block size-5 animate-spin rounded-full border-2 border-current border-t-transparent",
        className,
      )}
    />
  );
}
