import { cn } from "@/lib/cn";

export function LogoMark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "relative grid size-9 shrink-0 place-items-center overflow-hidden rounded-[11px] bg-panel shadow-[0_6px_18px_-8px_rgba(0,0,0,0.6)]",
        className,
      )}
      aria-hidden="true"
    >
      <span className="absolute inset-0 bg-[radial-gradient(120%_120%_at_20%_0%,rgba(212,163,115,0.38),transparent_55%)]" />
      <span className="relative flex h-[17px] items-end gap-[2.5px]">
        <span className="h-[9px] w-[2.5px] rounded-full bg-accent" />
        <span className="h-[17px] w-[2.5px] rounded-full bg-accent" />
        <span className="h-[12px] w-[2.5px] rounded-full bg-accent/90" />
        <span className="h-[6px] w-[2.5px] rounded-full bg-accent/60" />
      </span>
    </span>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark />
      <span className="text-[13px] font-extrabold uppercase tracking-[0.22em] text-ink">
        IronBeat
      </span>
    </span>
  );
}
