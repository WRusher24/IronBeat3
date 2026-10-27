"use client";

import {
  ChevronLeft,
  ListMusic,
  Pencil,
  Play,
  RefreshCw,
  Shuffle,
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { usePlayerActions } from "@/components/player/player-provider";
import { PlaylistSheet } from "@/components/playlist-sheet";
import { TrackList } from "@/components/track-list";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { IconButton } from "@/components/ui/icon-button";
import { TrackListSkeleton } from "@/components/ui/skeletons";
import { useToast } from "@/components/ui/toast";
import { apiFetch, ApiError, errorMessage } from "@/lib/client-api";
import { formatLongDuration } from "@/lib/format";
import type { PlaylistDetail, Track } from "@/types";

type PageStatus = "loading" | "ready" | "error" | "missing";

export default function PlaylistDetailPage() {
  const params = useParams<{ playlistId: string }>();
  const router = useRouter();
  const playlistId =
    typeof params.playlistId === "string" ? params.playlistId : "";
  const { playQueue } = usePlayerActions();
  const { toast } = useToast();

  const [playlist, setPlaylist] = useState<PlaylistDetail | null>(null);
  const [status, setStatus] = useState<PageStatus>("loading");
  const [message, setMessage] = useState("");
  const [editOpen, setEditOpen] = useState(false);

  const load = useCallback(async () => {
    if (!playlistId) {
      setStatus("missing");
      return;
    }

    setStatus("loading");
    try {
      const data = await apiFetch<{ playlist: PlaylistDetail }>(
        `/api/playlists/${playlistId}`,
      );
      setPlaylist(data.playlist);
      setStatus("ready");
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) {
        setStatus("missing");
      } else {
        setStatus("error");
        setMessage(errorMessage(error));
      }
    }
  }, [playlistId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleRemove(track: Track) {
    if (!playlist) {
      return;
    }

    try {
      await apiFetch(
        `/api/playlists/${playlist.id}/tracks/${track.videoId}`,
        { method: "DELETE" },
      );
      setPlaylist((current) =>
        current
          ? {
              ...current,
              tracks: current.tracks.filter(
                (item) => item.videoId !== track.videoId,
              ),
            }
          : current,
      );
      toast("Removed from playlist");
    } catch (error) {
      toast(errorMessage(error), "error");
    }
  }

  const totalSeconds =
    playlist?.tracks.reduce((total, track) => total + track.duration, 0) ?? 0;

  return (
    <div className="px-5 pt-[max(env(safe-area-inset-top),1rem)]">
      <header className="flex items-center justify-between">
        <Link
          href="/playlists"
          aria-label="Back to library"
          className="grid size-10 place-items-center rounded-full border border-border bg-surface/70 text-muted transition hover:text-ink focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-accent/25"
        >
          <ChevronLeft className="size-5" />
        </Link>

        {status === "ready" && playlist ? (
          <div className="flex items-center gap-1">
            <IconButton
              label="Reload playlist"
              onClick={() => void load()}
              className="size-9"
            >
              <RefreshCw className="size-4" />
            </IconButton>
            <IconButton
              label="Edit playlist"
              onClick={() => setEditOpen(true)}
              className="size-9"
            >
              <Pencil className="size-4" />
            </IconButton>
          </div>
        ) : (
          <span />
        )}
      </header>

      {status === "loading" ? (
        <div className="mt-8" aria-hidden="true">
          <span className="block size-16 animate-pulse rounded-3xl bg-surface-soft" />
          <span className="mt-4 block h-8 w-2/3 animate-pulse rounded-full bg-surface-soft" />
          <span className="mt-3 block h-3 w-1/2 animate-pulse rounded-full bg-surface-soft" />
          <div className="mt-8">
            <TrackListSkeleton rows={6} />
          </div>
        </div>
      ) : status === "missing" ? (
        <div className="mt-10">
          <EmptyState
            icon={<ListMusic className="size-5" />}
            title="That playlist is gone"
            description="It may have been deleted, or it belongs to another account."
            action={
              <Button
                size="sm"
                variant="outline"
                onClick={() => router.replace("/playlists")}
              >
                Back to library
              </Button>
            }
          />
        </div>
      ) : status === "error" || !playlist ? (
        <div className="mt-10">
          <EmptyState
            title="Couldn't load this playlist"
            description={message || "Check your connection and try again."}
            action={
              <Button size="sm" variant="outline" onClick={() => void load()}>
                Retry
              </Button>
            }
          />
        </div>
      ) : (
        <>
          <section className="mt-6 animate-rise">
            <span className="grid size-16 place-items-center rounded-[22px] border border-border bg-surface text-[30px] shadow-[0_18px_40px_-32px_rgba(0,0,0,0.6)]">
              {playlist.emoji}
            </span>
            <h1 className="mt-4 font-display text-[34px] leading-[1.02] tracking-[-0.02em]">
              {playlist.name}
            </h1>
            {playlist.description ? (
              <p className="mt-2 max-w-[360px] text-[13px] leading-relaxed text-muted">
                {playlist.description}
              </p>
            ) : null}
            <p className="mt-2 text-[11px] uppercase tracking-[0.14em] text-faint">
              {playlist.tracks.length}{" "}
              {playlist.tracks.length === 1 ? "track" : "tracks"}
              {totalSeconds > 0 ? ` · ${formatLongDuration(totalSeconds)}` : ""}
            </p>

            {playlist.tracks.length > 0 ? (
              <div className="mt-5 flex items-center gap-2">
                <Button
                  onClick={() => playQueue(playlist.tracks, 0)}
                  icon={<Play className="size-4 fill-current" />}
                  className="flex-1"
                >
                  Play all
                </Button>
                <Button
                  variant="outline"
                  onClick={() =>
                    playQueue(playlist.tracks, 0, { shuffle: true })
                  }
                  icon={<Shuffle className="size-4" />}
                >
                  Shuffle
                </Button>
              </div>
            ) : null}
          </section>

          <section className="mt-6">
            {playlist.tracks.length === 0 ? (
              <EmptyState
                icon={<ListMusic className="size-5" />}
                title="This folder is empty"
                description="Search for a vibe, then use the + button on any track to drop it in here."
                action={
                  <Link
                    href="/search"
                    className="inline-flex h-9 items-center gap-1.5 rounded-full bg-panel px-4 text-[12px] font-semibold text-on-panel"
                  >
                    <Play className="size-3.5 fill-current" />
                    Find tracks
                  </Link>
                }
              />
            ) : (
              <TrackList
                tracks={playlist.tracks}
                onRemove={handleRemove}
              />
            )}
          </section>

          {playlist.tracks.length > 0 ? (
            <p className="mt-6 text-center text-[10px] uppercase tracking-[0.16em] text-faint">
              Tap play to queue the whole folder
            </p>
          ) : null}
        </>
      )}

      {playlist ? (
        <PlaylistSheet
          open={editOpen}
          onClose={() => setEditOpen(false)}
          playlist={{
            id: playlist.id,
            name: playlist.name,
            description: playlist.description,
            emoji: playlist.emoji,
          }}
          onSaved={(updated) => {
            setPlaylist((current) =>
              current
                ? {
                    ...current,
                    name: updated.name,
                    description: updated.description,
                    emoji: updated.emoji,
                    updatedAt: updated.updatedAt,
                  }
                : current,
            );
            setEditOpen(false);
          }}
          onDeleted={() => {
            setEditOpen(false);
            router.replace("/playlists");
          }}
        />
      ) : null}
    </div>
  );
}
