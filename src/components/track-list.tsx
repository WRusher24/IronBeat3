"use client";

import { Music2 } from "lucide-react";
import { useState, type ReactNode } from "react";

import { AddToPlaylistSheet } from "@/components/add-to-playlist-sheet";
import { TrackRow } from "@/components/track-row";
import { usePlayerActions } from "@/components/player/player-provider";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/cn";
import type { Track } from "@/types";

type TrackListProps = {
  tracks: Track[];
  onRemove?: (track: Track) => Promise<void> | void;
  emptyState?: ReactNode;
  className?: string;
};

export function TrackList({
  tracks,
  onRemove,
  emptyState,
  className,
}: TrackListProps) {
  const { playQueue } = usePlayerActions();
  const [addTarget, setAddTarget] = useState<Track | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);

  if (tracks.length === 0) {
    return (
      <>
        {emptyState ?? (
          <EmptyState
            icon={<Music2 className="size-5" />}
            title="No tracks here yet"
            description="Search for a vibe and start building your training soundtrack."
          />
        )}
      </>
    );
  }

  async function handleRemove(track: Track) {
    if (!onRemove) {
      return;
    }
    setRemovingId(track.videoId);
    try {
      await onRemove(track);
    } finally {
      setRemovingId(null);
    }
  }

  return (
    <>
      <ul className={cn("space-y-0.5", className)}>
        {tracks.map((track, index) => (
          <TrackRow
            key={track.videoId}
            track={track}
            onPlay={() => playQueue(tracks, index)}
            onAdd={() => setAddTarget(track)}
            onRemove={
              onRemove ? () => void handleRemove(track) : undefined
            }
            removing={removingId === track.videoId}
            showRemove={Boolean(onRemove)}
          />
        ))}
      </ul>

      <AddToPlaylistSheet
        track={addTarget}
        open={Boolean(addTarget)}
        onClose={() => setAddTarget(null)}
      />
    </>
  );
}
