import { cn } from "@/lib/cn";
import type { ReactNode } from "react";

type EmptyStateProps = {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
};

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-3xl border border-dashed border-border-strong bg-surface/50 px-6 py-10 text-center",
        className,
      )}
    >
      {icon ? (
        <div className="mb-3 grid size-11 place-items-center rounded-2xl bg-surface text-accent">
          {icon}
        </div>
      ) : null}
      <p className="text-[15px] font-semibold tracking-[-0.01em]">{title}</p>
      {description ? (
        <p className="mt-1.5 max-w-[260px] text-[13px] leading-relaxed text-muted">
          {description}
        </p>
      ) : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
