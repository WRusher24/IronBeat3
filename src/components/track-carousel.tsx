"use client";

import { Play } from "lucide-react";

import type { Track } from "@/types";

type TrackCarouselProps = {
  tracks: Track[];
  onPlay: (index: number) => void;
  label: string;
};

export function TrackCarousel({ tracks, onPlay, label }: TrackCarouselProps) {
  if (tracks.length === 0) {
    return null;
  }

  return (
    <div
      className="no-scrollbar -mx-5 flex snap-x snap-mandatory gap-3 overflow-x-auto px-5 pb-1.5"
      aria-label={label}
    >
      {tracks.map((track, index) => (
        <button
          key={track.videoId}
          type="button"
          onClick={() => onPlay(index)}
          aria-label={`Play ${track.title} by ${track.artist}`}
          className="group w-[132px] shrink-0 snap-start text-left focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-accent/20"
        >
          <span className="relative block aspect-square overflow-hidden rounded-2xl border border-border bg-surface-soft">
            <img
              src={track.thumbnail}
              alt=""
              loading="lazy"
              decoding="async"
              referrerPolicy="no-referrer"
              className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
            />
            <span className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent" />
            <span className="absolute bottom-2 left-2 grid size-7 place-items-center rounded-full bg-bg/90 text-ink backdrop-blur">
              <Play className="ml-0.5 size-3 fill-current" />
            </span>
          </span>
          <span className="mt-2 block truncate text-[12px] font-semibold tracking-[-0.01em]">
            {track.title}
          </span>
          <span className="mt-0.5 block truncate text-[10.5px] text-muted">
            {track.artist}
          </span>
        </button>
      ))}
    </div>
  );
}
