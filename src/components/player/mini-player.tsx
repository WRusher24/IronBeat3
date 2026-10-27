"use client";

import { Loader2, Pause, Play, SkipForward } from "lucide-react";

import { usePlayer } from "@/components/player/player-provider";
import { Equalizer } from "@/components/ui/loaders";
import { IconButton } from "@/components/ui/icon-button";

export function MiniPlayer() {
  const {
    current,
    isPlaying,
    isLoading,
    isBlocked,
    error,
    currentTime,
    duration,
    toggle,
    next,
    setExpanded,
    isExpanded,
  } = usePlayer();

  if (!current || isExpanded) {
    return null;
  }

  const total = duration > 0 ? duration : current.duration;
  const progress =
    total > 0 ? Math.min(100, Math.max(0, (currentTime / total) * 100)) : 0;

  return (
    <div className="fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+4.85rem)] z-40 px-3">
      <div className="mx-auto max-w-[516px] overflow-hidden rounded-[20px] border border-border bg-surface/95 shadow-[0_20px_60px_-28px_rgba(0,0,0,0.65)] backdrop-blur-xl animate-rise">
        <div className="h-[3px] bg-surface-soft">
          <div
            className="h-full bg-accent transition-[width] duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="flex items-center gap-2.5 p-2.5">
          <button
            type="button"
            onClick={() => setExpanded(true)}
            className="flex min-w-0 flex-1 items-center gap-3 rounded-xl text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
            aria-label="Open now playing"
          >
            <span className="relative size-11 shrink-0 overflow-hidden rounded-xl bg-surface-soft">
              <img
                src={current.thumbnail}
                alt=""
                referrerPolicy="no-referrer"
                className="h-full w-full object-cover"
              />
              <span className="absolute inset-0 bg-black/10" />
            </span>

            <span className="min-w-0 flex-1">
              <span className="block truncate text-[13px] font-semibold leading-tight tracking-[-0.01em]">
                {current.title}
              </span>
              <span className="mt-1 flex min-h-[14px] items-center gap-1.5 text-[11px] text-muted">
                {isBlocked ? (
                  <span className="font-semibold text-accent">
                    Tap play to start audio
                  </span>
                ) : error ? (
                  <span className="truncate text-[color:var(--danger)]">
                    {error}
                  </span>
                ) : (
                  <>
                    {isPlaying ? <Equalizer className="h-2.5" /> : null}
                    <span className="truncate">{current.artist}</span>
                  </>
                )}
              </span>
            </span>
          </button>

          <button
            type="button"
            onClick={toggle}
            aria-label={isPlaying ? "Pause" : "Play"}
            className="grid size-10 shrink-0 place-items-center rounded-full bg-panel text-on-panel transition active:scale-95 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-accent/25"
          >
            {isLoading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : isPlaying ? (
              <Pause className="size-[17px] fill-current" />
            ) : (
              <Play className="ml-0.5 size-[17px] fill-current" />
            )}
          </button>

          <IconButton
            label="Next track"
            onClick={next}
            className="size-9 text-muted"
          >
            <SkipForward className="size-[17px] fill-current" />
          </IconButton>
        </div>
      </div>
    </div>
  );
}
