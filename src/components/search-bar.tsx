"use client";

import { ArrowUpRight, Search, X } from "lucide-react";
import {
  useId,
  useRef,
  useState,
  type FormEvent,
} from "react";

import { cn } from "@/lib/cn";

type SearchBarProps = {
  initialValue?: string;
  onSearch: (query: string) => void;
  placeholder?: string;
  compact?: boolean;
  autoFocus?: boolean;
};

export function SearchBar({
  initialValue = "",
  onSearch,
  placeholder = 'Try "brazilian phonk"',
  compact = false,
  autoFocus = false,
}: SearchBarProps) {
  const [value, setValue] = useState(initialValue);
  const inputRef = useRef<HTMLInputElement>(null);
  const inputId = useId();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const query = value.trim();
    if (!query) {
      inputRef.current?.focus();
      return;
    }
    onSearch(query);
  }

  return (
    <form onSubmit={handleSubmit} role="search" className="relative">
      <label htmlFor={inputId} className="sr-only">
        Search for music
      </label>
      <Search
        aria-hidden="true"
        className="pointer-events-none absolute left-4 top-1/2 size-[18px] -translate-y-1/2 text-muted"
      />
      <input
        ref={inputRef}
        id={inputId}
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        enterKeyHint="search"
        inputMode="search"
        maxLength={120}
        className={cn(
          "w-full rounded-2xl border border-border bg-surface pl-11 pr-[5.5rem] text-[15px] text-ink shadow-[0_16px_40px_-30px_rgba(0,0,0,0.55)] placeholder:text-faint focus:border-accent focus:outline-none focus:ring-4 focus:ring-accent/15",
          compact ? "h-12" : "h-14",
        )}
      />

      {value ? (
        <button
          type="button"
          onClick={() => {
            setValue("");
            inputRef.current?.focus();
          }}
          aria-label="Clear search"
          className="absolute right-[3.15rem] top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-full text-muted transition hover:bg-surface-soft hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
        >
          <X className="size-4" />
        </button>
      ) : null}

      <button
        type="submit"
        aria-label="Search and play"
        className={cn(
          "absolute right-1.5 top-1/2 grid -translate-y-1/2 place-items-center rounded-xl bg-panel text-on-panel transition active:scale-95 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-accent/25",
          compact ? "size-9" : "size-11",
        )}
      >
        <ArrowUpRight className={compact ? "size-4" : "size-[18px]"} />
      </button>
    </form>
  );
}
