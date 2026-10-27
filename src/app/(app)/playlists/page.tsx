"use client";

import {
  Heart,
  ListMusic,
  Loader2,
  Play,
  Plus,
  Search,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { useFavorites } from "@/components/favorites-provider";
import { usePlayerActions } from "@/components/player/player-provider";
import { PlaylistSheet } from "@/components/playlist-sheet";
import { SmartShuffleButton } from "@/components/smart-shuffle-button";
import { TrackList } from "@/components/track-list";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { TrackListSkeleton } from "@/components/ui/skeletons";
import { useToast } from "@/components/ui/toast";
import { apiFetch, errorMessage } from "@/lib/client-api";
import { cn } from "@/lib/cn";
import type {
  PlaylistDetail,
  PlaylistSummary,
  Track,
} from "@/types";

type TabId = "playlists" | "favorites" | "recent";

const TABS: Array<{ id: TabId; label: string }> = [
  { id: "playlists", label: "Playlists" },
  { id: "favorites", label: "Favorites" },
  { id: "recent", label: "Recent" },
];

export default function LibraryPage() {
  const { playQueue } = usePlayerActions();
  const { favorites, loading: favoritesLoading, refresh } = useFavorites();
  const { toast } = useToast();

  const [tab, setTab] = useState<TabId>("playlists");
  const [playlists, setPlaylists] = useState<PlaylistSummary[]>([]);
  const [loadingPlaylists, setLoadingPlaylists] = useState(true);
  const [recent, setRecent] = useState<Track[]>([]);
  const [loadingRecent, setLoadingRecent] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [openingId, setOpeningId] = useState<string | null>(null);

  const loadPlaylists = useCallback(async () => {
    setLoadingPlaylists(true);
    try {
      const data = await apiFetch<{ playlists: PlaylistSummary[] }>(
        "/api/playlists",
      );
      setPlaylists(data.playlists);
    } catch (error) {
      toast(errorMessage(error), "error");
    } finally {
      setLoadingPlaylists(false);
    }
  }, [toast]);

  const loadRecent = useCallback(async () => {
    setLoadingRecent(true);
    try {
      const data = await apiFetch<{ tracks: Track[] }>("/api/plays?limit=30");
      setRecent(data.tracks);
    } catch {
      // Recent plays are a convenience; silent failure is acceptable.
    } finally {
      setLoadingRecent(false);
    }
  }, []);

  useEffect(() => {
    void loadPlaylists();
  }, [loadPlaylists]);

  useEffect(() => {
    if (tab === "recent") {
      void loadRecent();
    }
  }, [tab, loadRecent]);

  async function playPlaylist(playlist: PlaylistSummary) {
    setOpeningId(playlist.id);
    try {
      const data = await apiFetch<{ playlist: PlaylistDetail }>(
        `/api/playlists/${playlist.id}`,
      );

      if (data.playlist.tracks.length === 0) {
        toast("That playlist is empty. Add tracks from search.", "error");
        return;
      }

      playQueue(data.playlist.tracks, 0);
      toast(`Playing ${data.playlist.name}`, "success");
    } catch (error) {
      toast(errorMessage(error), "error");
    } finally {
      setOpeningId(null);
    }
  }

  return (
    <div className="px-5 pt-[max(env(safe-area-inset-top),1.1rem)]">
      <header className="flex items-start justify-between gap-4">
        <div>
          <p className="eyebrow">Your library</p>
          <h1 className="mt-1 font-display text-[36px] leading-[0.98] tracking-[-0.02em]">
            Built for
            <br />
            your block.
          </h1>
        </div>
        <Button
          size="sm"
          variant="panel"
          onClick={() => setSheetOpen(true)}
          icon={<Plus className="size-4" />}
          className="mt-1"
        >
          New
        </Button>
      </header>

      <div className="mt-5">
        <SmartShuffleButton />
      </div>

      <div
        role="tablist"
        aria-label="Library sections"
        className="mt-6 flex rounded-full border border-border bg-surface/60 p-1"
      >
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={tab === item.id}
            onClick={() => setTab(item.id)}
            className={cn(
              "flex-1 rounded-full px-3 py-2 text-[12px] font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40",
              tab === item.id
                ? "bg-panel text-on-panel shadow-sm"
                : "text-muted hover:text-ink",
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="mt-5" role="tabpanel">
        {tab === "playlists" ? (
          loadingPlaylists ? (
            <div className="grid grid-cols-2 gap-2.5" aria-hidden="true">
              {[0, 1, 2, 3].map((index) => (
                <div
                  key={index}
                  className="h-[148px] animate-pulse rounded-3xl border border-border bg-surface/60"
                />
              ))}
            </div>
          ) : playlists.length === 0 ? (
            <EmptyState
              icon={<ListMusic className="size-5" />}
              title="No training folders yet"
              description="Create a playlist for push days, PR attempts, or a 20-minute finisher."
              action={
                <Button
                  size="sm"
                  onClick={() => setSheetOpen(true)}
                  icon={<Plus className="size-4" />}
                >
                  Create playlist
                </Button>
              }
            />
          ) : (
            <div className="grid grid-cols-2 gap-2.5">
              {playlists.map((playlist) => (
                <div
                  key={playlist.id}
                  className="relative overflow-hidden rounded-3xl border border-border bg-surface p-3.5 transition hover:border-accent/30"
                >
                  <Link
                    href={`/playlists/${playlist.id}`}
                    aria-label={`Open ${playlist.name}`}
                    className="absolute inset-0 z-0 rounded-3xl focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-accent/25"
                  />

                  <div className="pointer-events-none relative z-[1] flex items-start justify-between">
                    <span className="grid size-11 place-items-center rounded-2xl bg-surface-soft text-[21px]">
                      {playlist.emoji}
                    </span>
                    <span className="grid size-8 place-items-center rounded-full border border-border bg-bg/60 text-muted">
                      <Play className="ml-0.5 size-3.5" />
                    </span>
                  </div>

                  <div className="pointer-events-none relative z-[1] mt-6">
                    <p className="line-clamp-2 text-[13.5px] font-semibold leading-snug tracking-[-0.01em]">
                      {playlist.name}
                    </p>
                    <p className="mt-1 text-[10.5px] text-muted">
                      {playlist.trackCount}{" "}
                      {playlist.trackCount === 1 ? "track" : "tracks"}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => void playPlaylist(playlist)}
                    aria-label={`Play ${playlist.name}`}
                    disabled={openingId !== null}
                    className="absolute bottom-3 right-3 z-10 grid size-9 place-items-center rounded-full bg-accent text-accent-ink shadow-[0_8px_20px_-10px_rgba(0,0,0,0.6)] transition active:scale-95 disabled:opacity-60 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-accent/30"
                  >
                    {openingId === playlist.id ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Play className="ml-0.5 size-4 fill-current" />
                    )}
                  </button>
                </div>
              ))}
            </div>
          )
        ) : null}

        {tab === "favorites" ? (
          favoritesLoading ? (
            <TrackListSkeleton rows={6} />
          ) : (
            <TrackList
              tracks={favorites}
              emptyState={
                <EmptyState
                  icon={<Heart className="size-5" />}
                  title="No favorites yet"
                  description="Tap the heart on any track to keep it one thumb away."
                  action={
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => void refresh()}
                    >
                      Refresh
                    </Button>
                  }
                />
              }
            />
          )
        ) : null}

        {tab === "recent" ? (
          loadingRecent ? (
            <TrackListSkeleton rows={6} />
          ) : (
            <TrackList
              tracks={recent}
              emptyState={
                <EmptyState
                  icon={<Search className="size-5" />}
                  title="No plays logged yet"
                  description="Start any track and it will appear here for a fast re-launch."
                  action={
                    <Link
                      href="/search"
                      className="inline-flex h-9 items-center rounded-full bg-panel px-4 text-[12px] font-semibold text-on-panel"
                    >
                      Search music
                    </Link>
                  }
                />
              }
            />
          )
        ) : null}
      </div>

      <p className="mt-8 text-center text-[10px] uppercase tracking-[0.18em] text-faint">
        {playlists.length > 0
          ? `${playlists.length} ${playlists.length === 1 ? "training folder" : "training folders"} · private to you`
          : "Your private vault"}
      </p>

      <PlaylistSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        onSaved={(playlist) => {
          setPlaylists((current) => [
            playlist,
            ...current.filter((item) => item.id !== playlist.id),
          ]);
          setSheetOpen(false);
        }}
      />
    </div>
  );
}
