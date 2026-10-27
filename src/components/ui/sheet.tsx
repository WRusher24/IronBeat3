"use client";

import { X } from "lucide-react";
import {
  useEffect,
  useRef,
  type ReactNode,
} from "react";

import { cn } from "@/lib/cn";
import { IconButton } from "@/components/ui/icon-button";

type SheetProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
};

export function Sheet({
  open,
  onClose,
  title,
  description,
  children,
  className,
}: SheetProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    const focusTimer = window.setTimeout(() => panelRef.current?.focus(), 40);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
      window.clearTimeout(focusTimer);
    };
  }, [open, onClose]);

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[60] flex flex-col justify-end">
      <button
        type="button"
        aria-label="Close panel"
        onClick={onClose}
        className="absolute inset-0 bg-black/45 backdrop-blur-[2px] animate-fade-in"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className={cn(
          "relative mx-auto max-h-[88dvh] w-full max-w-[540px] overflow-y-auto rounded-t-[28px] border border-border bg-bg px-5 pb-[max(env(safe-area-inset-bottom),1.25rem)] pt-2.5 shadow-[0_-24px_80px_-30px_rgba(0,0,0,0.55)] outline-none animate-sheet-in",
          className,
        )}
      >
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-border-strong" />
        <div className="flex items-start justify-between gap-4 pb-4">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold tracking-[-0.02em]">{title}</h2>
            {description ? (
              <p className="mt-1 text-sm leading-relaxed text-muted">
                {description}
              </p>
            ) : null}
          </div>
          <IconButton label="Close" onClick={onClose}>
            <X className="size-5" />
          </IconButton>
        </div>
        {children}
      </div>
    </div>
  );
}
