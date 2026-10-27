"use client";

import {
  Heart,
  ListPlus,
  Loader2,
  Play,
  Trash2,
} from "lucide-react";

import { useFavorites } from "@/components/favorites-provider";
import { usePlayer } from "@/components/player/player-provider";
import { Equalizer } from "@/components/ui/loaders";
import { cn } from "@/lib/cn";
import { formatDuration } from "@/lib/format";
import type { Track } from "@/types";

type TrackRowProps = {
  track: Track;
  onPlay: () => void;
  onAdd: () => void;
  onRemove?: () => void;
  removing?: boolean;
  showRemove?: boolean;
};

export function TrackRow({
  track,
  onPlay,
  onAdd,
  onRemove,
  removing = false,
  showRemove = false,
}: TrackRowProps) {
  const { current, isPlaying, isLoading } = usePlayer();
  const { isFavorite, toggle, pendingIds } = useFavorites();

  const active = current?.videoId === track.videoId;
  const favorited = isFavorite(track.videoId);
  const favoritePending = pendingIds.has(track.videoId);

  return (
    <li
      className={cn(
        "group flex items-center gap-2 rounded-2xl px-1.5 py-1.5 transition-colors",
        active ? "bg-accent/10" : "hover:bg-surface/60",
      )}
    >
      <button
        type="button"
        onClick={onPlay}
        className="flex min-w-0 flex-1 items-center gap-3 rounded-xl text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
        aria-label={`Play ${track.title}`}
        aria-current={active ? "true" : undefined}
      >
        <span className="relative size-12 shrink-0 overflow-hidden rounded-xl bg-surface-soft">
          <img
            src={track.thumbnail}
            alt=""
            loading="lazy"
            decoding="async"
            referrerPolicy="no-referrer"
            className="h-full w-full object-cover"
          />
          <span
            className={cn(
              "absolute inset-0 grid place-items-center bg-black/35 transition-opacity",
              active ? "opacity-100" : "opacity-0 group-hover:opacity-100",
            )}
          >
            {active && isPlaying ? (
              <Equalizer />
            ) : active && isLoading ? (
              <Loader2 className="size-4 animate-spin text-white" />
            ) : (
              <Play className="size-4 fill-white text-white" />
            )}
          </span>
        </span>

        <span className="min-w-0 flex-1">
          <span
            className={cn(
              "block truncate text-[13.5px] font-semibold leading-snug tracking-[-0.01em]",
              active && "text-accent",
            )}
          >
            {track.title}
          </span>
          <span className="mt-0.5 block truncate text-[11.5px] text-muted">
            {track.artist}
            {track.duration > 0 ? ` · ${formatDuration(track.duration)}` : ""}
          </span>
        </span>
      </button>

      <div className="flex shrink-0 items-center gap-0.5">
        <button
          type="button"
          onClick={() => void toggle(track)}
          disabled={favoritePending}
          aria-label={favorited ? "Remove from favorites" : "Save to favorites"}
          aria-pressed={favorited}
          className={cn(
            "grid size-9 place-items-center rounded-full transition active:scale-95 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40",
            favorited
              ? "text-accent"
              : "text-muted hover:bg-surface-soft hover:text-ink",
          )}
        >
          {favoritePending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Heart className={cn("size-[17px]", favorited && "fill-current")} />
          )}
        </button>

        <button
          type="button"
          onClick={onAdd}
          aria-label="Add to playlist"
          className="grid size-9 place-items-center rounded-full text-muted transition hover:bg-surface-soft hover:text-ink active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
        >
          <ListPlus className="size-[17px]" />
        </button>

        {showRemove && onRemove ? (
          <button
            type="button"
            onClick={onRemove}
            disabled={removing}
            aria-label="Remove from playlist"
            className="grid size-9 place-items-center rounded-full text-muted transition hover:bg-[color:var(--danger)]/10 hover:text-[color:var(--danger)] active:scale-95 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
          >
            {removing ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Trash2 className="size-[16px]" />
            )}
          </button>
        ) : null}
      </div>
    </li>
  );
}
