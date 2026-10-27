"use client";

import { Clock3, Sparkles } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { useFavorites } from "@/components/favorites-provider";
import { usePlayerActions } from "@/components/player/player-provider";
import { SearchBar } from "@/components/search-bar";
import { SearchChips } from "@/components/search-chips";
import { SmartShuffleButton } from "@/components/smart-shuffle-button";
import { TrackCarousel } from "@/components/track-carousel";
import { Logo } from "@/components/ui/logo";
import { VibeDeck } from "@/components/vibe-deck";
import { apiFetch } from "@/lib/client-api";
import { firstNameFor, initialsFor } from "@/lib/format";
import { STARTER_CHIPS, type Vibe } from "@/lib/vibes";
import type {
  PublicUser,
  SearchHistoryEntry,
  Track,
} from "@/types";

export default function HomePage() {
  const router = useRouter();
  const { playQueue } = usePlayerActions();
  const { favorites } = useFavorites();
  const [history, setHistory] = useState<SearchHistoryEntry[]>([]);
  const [recent, setRecent] = useState<Track[]>([]);
  const [user, setUser] = useState<PublicUser | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    let alive = true;

    void Promise.allSettled([
      apiFetch<{ entries: SearchHistoryEntry[] }>("/api/history", {
        signal: controller.signal,
      }),
      apiFetch<{ tracks: Track[] }>("/api/plays?limit=8", {
        signal: controller.signal,
      }),
      apiFetch<{ user: PublicUser }>("/api/auth/me", {
        signal: controller.signal,
      }),
    ]).then((results) => {
      if (!alive) {
        return;
      }

      const [historyResult, playsResult, meResult] = results;

      if (historyResult.status === "fulfilled") {
        setHistory(historyResult.value.entries);
      }
      if (playsResult.status === "fulfilled") {
        setRecent(playsResult.value.tracks);
      }
      if (meResult.status === "fulfilled") {
        setUser(meResult.value.user);
      }
    });

    return () => {
      alive = false;
      controller.abort();
    };
  }, []);

  const launchSearch = (query: string) => {
    router.push(`/search?q=${encodeURIComponent(query)}&autoplay=1`);
  };

  const launchVibe = (vibe: Vibe) => {
    router.push(
      `/search?q=${encodeURIComponent(vibe.query)}&autoplay=1&label=${encodeURIComponent(vibe.label)}`,
    );
  };

  const chips =
    history.length > 0 ? history.map((entry) => entry.query) : STARTER_CHIPS;
  const firstName = user
    ? firstNameFor(user.displayName, user.email)
    : "Athlete";
  const initials = user ? initialsFor(user.displayName, user.email) : "IB";

  return (
    <div className="px-5 pt-[max(env(safe-area-inset-top),1.1rem)]">
      <header className="flex items-center justify-between">
        <Logo />
        <Link
          href="/settings"
          aria-label="Open settings"
          className="grid size-9 place-items-center rounded-full border border-border bg-panel text-[11px] font-bold tracking-wide text-on-panel transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-accent/25"
        >
          {initials}
        </Link>
      </header>

      <section className="mt-8 animate-rise">
        <p className="eyebrow">Train hard · stay locked in</p>
        <h1 className="mt-2 font-display text-[42px] leading-[0.97] tracking-[-0.02em] text-balance">
          Ready to{" "}
          <em className="text-accent-strong">lift heavy,</em>
          <br />
          {firstName}?
        </h1>
        <p className="mt-3 max-w-[310px] text-[13px] leading-relaxed text-muted">
          Search a sound. Tap a vibe. IronBeat keeps the music running from the
          first warm-up to the final rep.
        </p>
      </section>

      <section className="mt-6">
        <SearchBar onSearch={launchSearch} />
      </section>

      <section className="mt-4">
        <div className="mb-2 flex items-center justify-between">
          <p className="eyebrow flex items-center gap-1.5">
            {history.length > 0 ? (
              <>
                <Clock3 className="size-3" aria-hidden="true" />
                Quick launch
              </>
            ) : (
              <>
                <Sparkles className="size-3" aria-hidden="true" />
                Try a vibe
              </>
            )}
          </p>
          <Link
            href="/search"
            className="text-[11px] font-semibold text-muted underline decoration-border-strong decoration-1 underline-offset-4 transition hover:text-ink"
          >
            Open search
          </Link>
        </div>
        <SearchChips queries={chips} onSelect={launchSearch} />
      </section>

      <section className="mt-5">
        <SmartShuffleButton />
      </section>

      <section className="mt-8">
        <div className="flex items-end justify-between">
          <div>
            <p className="eyebrow">Your vibe deck</p>
            <h2 className="mt-1 text-[20px] font-semibold tracking-[-0.02em]">
              Pick the energy
            </h2>
          </div>
          <span className="text-[11px] text-muted">8 moods</span>
        </div>
        <p className="mt-1 text-[12px] text-muted">
          Every mood is right here. Tap one and the music starts.
        </p>
        <div className="mt-4">
          <VibeDeck onSelect={launchVibe} />
        </div>
      </section>

      {recent.length > 0 ? (
        <section className="mt-9">
          <div className="mb-3 flex items-end justify-between">
            <h2 className="text-[17px] font-semibold tracking-[-0.02em]">
              Jump back in
            </h2>
            <span className="text-[11px] text-muted">Recent plays</span>
          </div>
          <TrackCarousel
            tracks={recent}
            label="Recently played tracks"
            onPlay={(index) => playQueue(recent, index)}
          />
        </section>
      ) : null}

      {favorites.length > 0 ? (
        <section className="mt-9">
          <div className="mb-3 flex items-end justify-between">
            <h2 className="text-[17px] font-semibold tracking-[-0.02em]">
              Saved for the next set
            </h2>
            <Link
              href="/playlists"
              className="text-[11px] font-semibold text-muted underline decoration-border-strong decoration-1 underline-offset-4 transition hover:text-ink"
            >
              Library
            </Link>
          </div>
          <TrackCarousel
            tracks={favorites.slice(0, 10)}
            label="Favorite tracks"
            onPlay={(index) => playQueue(favorites, index)}
          />
        </section>
      ) : null}

      <footer className="mt-12 pb-2 text-center text-[9.5px] uppercase tracking-[0.2em] text-faint">
        Built for the gym floor · Streams via Piped
      </footer>
    </div>
  );
}
