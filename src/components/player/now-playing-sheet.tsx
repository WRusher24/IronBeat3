"use client";

import {
  ChevronDown,
  Heart,
  ListPlus,
  Loader2,
  Pause,
  Play,
  Repeat,
  Repeat1,
  Shuffle,
  SkipBack,
  SkipForward,
} from "lucide-react";
import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";

import { AddToPlaylistSheet } from "@/components/add-to-playlist-sheet";
import { useFavorites } from "@/components/favorites-provider";
import { usePlayer } from "@/components/player/player-provider";
import { EmptyState } from "@/components/ui/empty-state";
import { IconButton } from "@/components/ui/icon-button";
import { cn } from "@/lib/cn";
import { formatDuration } from "@/lib/format";

export function NowPlayingSheet() {
  const {
    current,
    queue,
    currentIndex,
    isExpanded,
    isPlaying,
    isLoading,
    isBlocked,
    error,
    currentTime,
    duration,
    repeat,
    shuffle,
    toggle,
    next,
    previous,
    seek,
    setRepeat,
    toggleShuffle,
    playAt,
    setExpanded,
  } = usePlayer();
  const { isFavorite, toggle: toggleFavorite, pendingIds } = useFavorites();
  const [addOpen, setAddOpen] = useState(false);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isExpanded) {
      setAddOpen(false);
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusTimer = window.setTimeout(
      () => closeButtonRef.current?.focus(),
      60,
    );

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setExpanded(false);
      }
    };

    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
      window.clearTimeout(focusTimer);
    };
  }, [isExpanded, setExpanded]);

  if (!current || !isExpanded) {
    return null;
  }

  const total = duration > 0 ? duration : current.duration;
  const clampedTime = total > 0 ? Math.min(currentTime, total) : currentTime;
  const progress = total > 0 ? (clampedTime / total) * 100 : 0;
  const favorited = isFavorite(current.videoId);
  const favoritePending = pendingIds.has(current.videoId);
  const upcoming = queue.slice(currentIndex + 1, currentIndex + 6);
  const upcomingCount = Math.max(0, queue.length - currentIndex - 1);

  function cycleRepeat() {
    if (repeat === "off") {
      setRepeat("all");
    } else if (repeat === "all") {
      setRepeat("one");
    } else {
      setRepeat("off");
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Now playing"
      className="fixed inset-0 z-50 overflow-y-auto bg-bg animate-sheet-in"
    >
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <img
          src={current.thumbnail}
          alt=""
          aria-hidden="true"
          referrerPolicy="no-referrer"
          className="h-full w-full scale-125 object-cover opacity-25 blur-3xl"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-bg/55 via-bg/85 to-bg" />
      </div>

      <div className="relative mx-auto flex min-h-dvh w-full max-w-[540px] flex-col px-5 pb-[max(env(safe-area-inset-bottom),1.25rem)] pt-[max(env(safe-area-inset-top),0.75rem)]">
        <header className="flex items-center justify-between">
          <IconButton
            ref={closeButtonRef}
            label="Close player"
            onClick={() => setExpanded(false)}
          >
            <ChevronDown className="size-6" />
          </IconButton>

          <div className="text-center">
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted">
              Now playing
            </p>
            <p className="mt-0.5 text-[11px] text-faint">IronBeat radio</p>
          </div>

          <IconButton
            label={favorited ? "Remove from favorites" : "Save to favorites"}
            onClick={() => void toggleFavorite(current)}
            disabled={favoritePending}
            tone={favorited ? "accent" : "default"}
          >
            {favoritePending ? (
              <Loader2 className="size-5 animate-spin" />
            ) : (
              <Heart
                className={cn("size-5", favorited && "fill-current")}
              />
            )}
          </IconButton>
        </header>

        <div className="mt-5 flex flex-1 flex-col">
          <div className="relative mx-auto aspect-square w-full max-w-[360px] overflow-hidden rounded-[30px] border border-border bg-panel shadow-[0_30px_80px_-35px_rgba(0,0,0,0.8)]">
            <img
              src={current.thumbnail}
              alt={current.title}
              className="h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-transparent" />
          </div>

          <div className="mt-6 flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <h1 className="text-balance font-display text-[27px] leading-[1.08] tracking-[-0.01em]">
                {current.title}
              </h1>
              <p className="mt-1.5 truncate text-[13px] text-muted">
                {current.artist}
              </p>
            </div>
            <IconButton
              label="Add to playlist"
              onClick={() => setAddOpen(true)}
              className="mt-1"
            >
              <ListPlus className="size-5" />
            </IconButton>
          </div>

          {isBlocked ? (
            <button
              type="button"
              onClick={toggle}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border border-accent/35 bg-accent/10 px-4 py-3 text-[13px] font-semibold text-accent transition active:scale-[0.99]"
            >
              <Play className="size-4 fill-current" />
              Tap to start audio on this device
            </button>
          ) : null}

          {error ? (
            <p className="mt-3 text-center text-[12px] font-medium text-[color:var(--danger)]">
              {error}
            </p>
          ) : null}

          <div className="mt-5">
            <input
              type="range"
              min={0}
              max={total > 0 ? total : 0}
              step={0.5}
              value={clampedTime}
              onChange={(event) => seek(Number(event.target.value))}
              disabled={total <= 0}
              aria-label="Seek through track"
              className="seek"
              style={{ "--progress": `${progress}%` } as CSSProperties}
            />
            <div className="mt-1 flex justify-between text-[11px] tabular-nums text-muted">
              <span>{formatDuration(clampedTime)}</span>
              <span>{formatDuration(total)}</span>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between">
            <IconButton
              label={shuffle ? "Turn shuffle off" : "Turn shuffle on"}
              onClick={toggleShuffle}
              className={cn("size-11", shuffle && "text-accent")}
            >
              <Shuffle className="size-[19px]" />
            </IconButton>

            <IconButton
              label="Previous track"
              onClick={previous}
              className="size-12"
            >
              <SkipBack className="size-[25px] fill-current" />
            </IconButton>

            <button
              type="button"
              onClick={toggle}
              aria-label={isPlaying ? "Pause" : "Play"}
              className="grid size-[68px] place-items-center rounded-full bg-accent text-accent-ink shadow-[0_18px_40px_-18px_rgba(212,163,115,0.9)] transition active:scale-95 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-accent/30"
            >
              {isLoading ? (
                <Loader2 className="size-7 animate-spin" />
              ) : isPlaying ? (
                <Pause className="size-7 fill-current" />
              ) : (
                <Play className="ml-1 size-7 fill-current" />
              )}
            </button>

            <IconButton label="Next track" onClick={next} className="size-12">
              <SkipForward className="size-[25px] fill-current" />
            </IconButton>

            <IconButton
              label={`Repeat: ${repeat}`}
              onClick={cycleRepeat}
              className={cn("size-11", repeat !== "off" && "text-accent")}
            >
              {repeat === "one" ? (
                <Repeat1 className="size-[19px]" />
              ) : (
                <Repeat className="size-[19px]" />
              )}
            </IconButton>
          </div>

          <section className="mt-8">
            <div className="flex items-baseline justify-between">
              <h2 className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted">
                Up next
              </h2>
              <span className="text-[11px] text-faint">
                {upcomingCount} {upcomingCount === 1 ? "track" : "tracks"}
              </span>
            </div>

            {upcoming.length === 0 ? (
              <EmptyState
                className="mt-3 border-solid bg-surface/40 py-6"
                title="Queue is clear"
                description="Search a vibe or open a playlist to load the next block."
              />
            ) : (
              <ul className="mt-2 space-y-0.5">
                {upcoming.map((track, offset) => {
                  const absoluteIndex = currentIndex + 1 + offset;
                  return (
                    <li key={`${track.videoId}-${absoluteIndex}`}>
                      <button
                        type="button"
                        onClick={() => playAt(absoluteIndex)}
                        className="flex w-full items-center gap-3 rounded-2xl px-1.5 py-1.5 text-left transition hover:bg-surface/70"
                      >
                        <span className="size-10 shrink-0 overflow-hidden rounded-lg bg-surface-soft">
                          <img
                            src={track.thumbnail}
                            alt=""
                            loading="lazy"
                            referrerPolicy="no-referrer"
                            className="h-full w-full object-cover"
                          />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[12.5px] font-semibold">
                            {track.title}
                          </span>
                          <span className="block truncate text-[11px] text-muted">
                            {track.artist}
                          </span>
                        </span>
                        <span className="shrink-0 text-[11px] tabular-nums text-faint">
                          {formatDuration(track.duration)}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>
      </div>

      <AddToPlaylistSheet
        track={current}
        open={addOpen}
        onClose={() => setAddOpen(false)}
      />
    </div>
  );
}
