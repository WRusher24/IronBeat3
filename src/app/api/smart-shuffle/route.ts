import { desc, eq } from "drizzle-orm";
import type { NextRequest } from "next/server";

import { getDb } from "@/db";
import { favorites, searchHistory, trackPlays } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth-server";
import {
  json,
  jsonError,
  tooManyRequests,
  unauthorized,
  withRouteErrorHandling,
} from "@/lib/http";
import { searchMusic } from "@/lib/music";
import { checkRateLimit } from "@/lib/rate-limit";
import { isSameOrigin } from "@/lib/request";
import { dedupeTracks, shuffleTracks } from "@/lib/tracks";
import type { SmartShuffleResponse, Track } from "@/types";

export const dynamic = "force-dynamic";

const FALLBACK_SEEDS = [
  "beast mode gym mix",
  "brazilian phonk mix",
  "heavy bass workout",
];

function tally(values: string[]): string[] {
  const counts = new Map<string, number>();
  for (const value of values) {
    const key = value.trim();
    if (!key) {
      continue;
    }
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([value]) => value);
}

export async function POST(request: NextRequest) {
  return withRouteErrorHandling(async () => {
    if (!isSameOrigin(request)) {
      return jsonError("Invalid request origin.", 403);
    }

    const user = await getCurrentUser();
    if (!user) {
      return unauthorized();
    }

    const limiter = checkRateLimit(`smart-shuffle:${user.id}`, 12, 60_000);
    if (!limiter.allowed) {
      return tooManyRequests(limiter.retryAfterSeconds);
    }

    const db = getDb();
    const [historyRows, favoriteRows, playRows] = await Promise.all([
      db
        .select({ query: searchHistory.query })
        .from(searchHistory)
        .where(eq(searchHistory.userId, user.id))
        .orderBy(desc(searchHistory.createdAt))
        .limit(200),
      db
        .select({
          videoId: favorites.videoId,
          title: favorites.title,
          artist: favorites.artist,
          thumbnail: favorites.thumbnail,
          duration: favorites.duration,
        })
        .from(favorites)
        .where(eq(favorites.userId, user.id))
        .orderBy(desc(favorites.createdAt))
        .limit(50),
      db
        .select({ artist: trackPlays.artist })
        .from(trackPlays)
        .where(eq(trackPlays.userId, user.id))
        .orderBy(desc(trackPlays.playedAt))
        .limit(200),
    ]);

    const querySeeds = tally(historyRows.map((row) => row.query));
    const artistSeeds = tally([
      ...favoriteRows.map((row) => row.artist),
      ...playRows.map((row) => row.artist),
    ]);

    const seeds = dedupeSeeds([
      ...querySeeds.slice(0, 2),
      ...artistSeeds.slice(0, 2).map((artist) => `${artist} mix`),
    ]).slice(0, 3);

    const activeSeeds = seeds.length > 0 ? seeds : FALLBACK_SEEDS;

    const settlements = await Promise.allSettled(
      activeSeeds.map((seed) => searchMusic(seed)),
    );

    const discovered: Track[] = [];
    for (const settlement of settlements) {
      if (settlement.status === "fulfilled") {
        discovered.push(...settlement.value);
      }
    }

    const favoriteTracks: Track[] = favoriteRows.map((row) => ({
      videoId: row.videoId,
      title: row.title,
      artist: row.artist,
      thumbnail: row.thumbnail,
      duration: row.duration,
    }));

    if (discovered.length === 0 && favoriteTracks.length === 0) {
      const hasProviderError = settlements.every(
        (settlement) => settlement.status === "rejected",
      );

      return jsonError(
        hasProviderError
          ? "Smart Shuffle could not reach a music provider. Try again in a moment."
          : "Search for a few tracks or save some favorites first, then hit Smart Shuffle.",
        503,
      );
    }

    const pool = dedupeTracks([
      ...shuffleTracks(favoriteTracks).slice(0, 10),
      ...discovered,
    ]);

    const tracks = shuffleTracks(pool).slice(0, 30);
    const response: SmartShuffleResponse = {
      tracks,
      basedOn: activeSeeds,
    };

    return json(response);
  });
}

function dedupeSeeds(values: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const value of values) {
    const normalized = value.trim();
    const key = normalized.toLowerCase();
    if (!normalized || seen.has(key)) {
      continue;
    }
    seen.add(key);
    result.push(normalized);
  }

  return result;
}
