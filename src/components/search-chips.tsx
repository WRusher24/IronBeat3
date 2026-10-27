"use client";

import { Zap } from "lucide-react";

type SearchChipsProps = {
  queries: string[];
  onSelect: (query: string) => void;
  label?: string;
};

export function SearchChips({ queries, onSelect, label }: SearchChipsProps) {
  if (queries.length === 0) {
    return null;
  }

  return (
    <div
      className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5 pb-0.5"
      role="group"
      aria-label={label ?? "Quick launch searches"}
    >
      {queries.map((query) => (
        <button
          key={query}
          type="button"
          onClick={() => onSelect(query)}
          className="flex shrink-0 items-center gap-1.5 rounded-full border border-border bg-surface/80 px-3.5 py-2 text-[12px] font-semibold text-ink transition hover:border-accent/40 hover:bg-surface active:scale-[0.98] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-accent/20"
        >
          <Zap className="size-3.5 text-accent" aria-hidden="true" />
          <span className="max-w-[190px] truncate">{query}</span>
        </button>
      ))}
    </div>
  );
}
