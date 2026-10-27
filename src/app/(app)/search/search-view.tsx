"use client";

import { Play, Shuffle, WifiOff } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { usePlayerActions } from "@/components/player/player-provider";
import { SearchBar } from "@/components/search-bar";
import { SearchChips } from "@/components/search-chips";
import { TrackList } from "@/components/track-list";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { IconButton } from "@/components/ui/icon-button";
import { TrackListSkeleton } from "@/components/ui/skeletons";
import { apiFetch, errorMessage } from "@/lib/client-api";
import { cn } from "@/lib/cn";
import { STARTER_CHIPS, VIBES, type Vibe } from "@/lib/vibes";
import type {
  MusicSearchResponse,
  SearchHistoryEntry,
  Track,
} from "@/types";

type SearchStatus = "idle" | "loading" | "ready" | "error";

export function SearchView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { playQueue } = usePlayerActions();

  const query = (searchParams.get("q") ?? "").trim();
  const autoplay = searchParams.get("autoplay") === "1";
  const vibeLabel = searchParams.get("label");

  const [tracks, setTracks] = useState<Track[]>([]);
  const [status, setStatus] = useState<SearchStatus>("idle");
  const [error, setError] = useState("");
  const [history, setHistory] = useState<SearchHistoryEntry[]>([]);
  const [reloadToken, setReloadToken] = useState(0);
  const playedForQuery = useRef<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    let alive = true;

    void apiFetch<{ entries: SearchHistoryEntry[] }>("/api/history", {
      signal: controller.signal,
    })
      .then((data) => {
        if (alive) {
          setHistory(data.entries);
        }
      })
      .catch(() => {
        // Search history is optional; starter chips cover the empty state.
      });

    return () => {
      alive = false;
      controller.abort();
    };
  }, []);

  useEffect(() => {
    if (!query) {
      setTracks([]);
      setStatus("idle");
      setError("");
      return;
    }

    if (query.length < 2) {
      setTracks([]);
      setStatus("idle");
      setError("");
      return;
    }

    const controller = new AbortController();
    setStatus("loading");
    setError("");

    void apiFetch<MusicSearchResponse>(
      `/api/music/search?q=${encodeURIComponent(query)}`,
      { signal: controller.signal },
    )
      .then((data) => {
        if (controller.signal.aborted) {
          return;
        }

        setTracks(data.tracks);
        setStatus("ready");

        if (data.tracks.length > 0) {
          void apiFetch("/api/history", {
            method: "POST",
            body: JSON.stringify({ query }),
          }).catch(() => {
            // History recording is best-effort.
          });

          if (autoplay && playedForQuery.current !== query) {
            playedForQuery.current = query;
            playQueue(data.tracks, 0);
          }
        }
      })
      .catch((requestError: unknown) => {
        if (controller.signal.aborted) {
          return;
        }
        if (
          requestError instanceof DOMException &&
          requestError.name === "AbortError"
        ) {
          return;
        }

        setTracks([]);
        setStatus("error");
        setError(errorMessage(requestError));
      });

    return () => controller.abort();
  }, [query, autoplay, playQueue, reloadToken]);

  function handleSearch(nextQuery: string) {
    if (nextQuery === query && tracks.length > 0) {
      playQueue(tracks, 0);
      return;
    }

    router.push(
      `/search?q=${encodeURIComponent(nextQuery)}&autoplay=1`,
    );
  }

  function launchVibe(vibe: Vibe) {
    router.push(
      `/search?q=${encodeURIComponent(vibe.query)}&autoplay=1&label=${encodeURIComponent(vibe.label)}`,
    );
  }

  const chips =
    history.length > 0 ? history.map((entry) => entry.query) : STARTER_CHIPS;

  return (
    <div className="px-5 pt-[max(env(safe-area-inset-top),1.1rem)]">
      <header className="flex items-start justify-between gap-4">
        <div>
          <p className="eyebrow">Instant search</p>
          <h1 className="mt-1 font-display text-[36px] leading-none tracking-[-0.02em]">
            Find the energy.
          </h1>
        </div>
        <span className="mt-1 rounded-full border border-border bg-surface/60 px-2.5 py-1 text-[9.5px] font-semibold uppercase tracking-[0.14em] text-muted">
          One tap
        </span>
      </header>

      <div className="sticky top-[max(env(safe-area-inset-top),0px)] z-30 -mx-5 mt-5 bg-bg/85 px-5 py-3 backdrop-blur-xl">
        <SearchBar
          key={query}
          initialValue={query}
          onSearch={handleSearch}
          compact
          autoFocus={false}
        />
      </div>

      {query ? (
        <section className="mt-1 animate-rise">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              {vibeLabel ? (
                <p className="eyebrow text-accent">{vibeLabel}</p>
              ) : null}
              <h2 className="mt-1 truncate text-[22px] font-semibold tracking-[-0.025em]">
                “{query}”
              </h2>
              <p className="mt-1 text-[11.5px] text-muted">
                {status === "loading"
                  ? "Finding the hardest tracks…"
                  : status === "ready"
                    ? `${tracks.length} ${tracks.length === 1 ? "track" : "tracks"} ready · autoplay on`
                    : status === "error"
                      ? "Provider unavailable"
                      : "Keep typing to search"}
              </p>
            </div>

            {status === "ready" && tracks.length > 0 ? (
              <div className="flex shrink-0 items-center gap-1">
                <IconButton
                  label="Shuffle results"
                  onClick={() => playQueue(tracks, 0, { shuffle: true })}
                  className="size-10"
                >
                  <Shuffle className="size-4" />
                </IconButton>
                <Button
                  size="sm"
                  onClick={() => playQueue(tracks, 0)}
                  icon={<Play className="size-3.5 fill-current" />}
                >
                  Play all
                </Button>
              </div>
            ) : null}
          </div>

          <div className="mt-5">
            {status === "loading" ? (
              <TrackListSkeleton rows={7} />
            ) : status === "error" ? (
              <EmptyState
                icon={<WifiOff className="size-5" />}
                title="The music service is catching its breath"
                description={error}
                action={
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setReloadToken((value) => value + 1)}
                  >
                    Try again
                  </Button>
                }
              />
            ) : status === "ready" && tracks.length === 0 ? (
              <EmptyState
                icon={<WifiOff className="size-5" />}
                title="Nothing matched that search"
                description="Try a broader vibe like “phonk mix”, “gym motivation”, or “nasheed”."
                action={
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => router.push("/search")}
                  >
                    Clear search
                  </Button>
                }
              />
            ) : status === "ready" ? (
              <TrackList tracks={tracks} />
            ) : (
              <EmptyState
                title="Add one more character"
                description="Searches need at least two characters."
              />
            )}
          </div>

          {status === "ready" && tracks.length > 0 ? (
            <div className="mt-6 rounded-3xl border border-border bg-surface/60 p-4">
              <p className="eyebrow">Autoplay queue armed</p>
              <p className="mt-1.5 text-[12.5px] leading-relaxed text-muted">
                Tap any track to jump in. When it ends, IronBeat rolls straight
                into the next one — even with the screen locked.
              </p>
            </div>
          ) : null}
        </section>
      ) : (
        <section className="mt-1 animate-rise">
          <div>
            <div className="mb-2 flex items-center justify-between">
              <p className="eyebrow">Quick launch</p>
              <span className="text-[10px] uppercase tracking-[0.14em] text-faint">
                Recent + starter
              </span>
            </div>
            <SearchChips queries={chips} onSelect={handleSearch} />
          </div>

          <div className="mt-8">
            <p className="eyebrow">Or pick a mood</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {VIBES.map((vibe) => (
                <button
                  key={vibe.id}
                  type="button"
                  onClick={() => launchVibe(vibe)}
                  className={cn(
                    "flex items-center gap-2 rounded-full border border-border bg-surface/75 px-3 py-2 text-[12px] font-semibold transition hover:border-accent/40 hover:bg-surface active:scale-[0.98] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-accent/20",
                  )}
                >
                  <span aria-hidden="true">{vibe.emoji}</span>
                  {vibe.label}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-9 rounded-3xl border border-border bg-panel p-5 text-on-panel">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-accent">
              Built for quick sets
            </p>
            <h2 className="mt-2 font-display text-[26px] leading-tight">
              Search, tap, lift.
            </h2>
            <p className="mt-2 text-[12.5px] leading-relaxed opacity-60">
              Every result is a direct audio stream. The global player survives
              page changes, docked above the tabs, with lock-screen controls
              wired through your iPhone.
            </p>
          </div>
        </section>
      )}
    </div>
  );
}
