import type { Track } from "@/types";

import { TtlCache } from "./cache";
import {
  getCandidates,
  markInstanceDown,
  markInstanceHealthy,
} from "./instances";
import { resolveInvidiousStreams, searchInvidious } from "./invidious";
import { resolvePipedStreams, searchPiped } from "./piped";
import {
  MusicServiceError,
  type ResolvedStream,
  type SearchFilter,
} from "./types";
import { UpstreamError } from "./upstream";

function parsePositiveInt(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

const SEARCH_TTL_MS =
  parsePositiveInt(process.env.SEARCH_CACHE_TTL_SECONDS, 180) * 1_000;

const searchCache = new TtlCache<string, Track[]>(SEARCH_TTL_MS, 400);
const streamCache = new TtlCache<string, ResolvedStream>(20 * 60_000, 500);

function shouldCoolDown(error: unknown): boolean {
  if (error instanceof MusicServiceError) {
    return error.code !== "no_audio" && error.code !== "not_found";
  }
  if (error instanceof UpstreamError) {
    // A 404/410 usually means the requested video is gone, not that the
    // provider is unhealthy; do not take the instance out of rotation.
    return error.status !== 404 && error.status !== 410;
  }
  return true;
}

export async function searchMusic(
  query: string,
  filter: SearchFilter = "videos",
): Promise<Track[]> {
  const normalized = query.replace(/\s+/g, " ").trim();
  const cacheKey = `${filter}:${normalized.toLowerCase()}`;
  const cached = searchCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  let reachableProvider = false;

  for (const base of getCandidates("piped", 3, "search")) {
    try {
      const tracks = await searchPiped(base, normalized, filter);
      reachableProvider = true;
      markInstanceHealthy(base, "search");

      if (tracks.length > 0) {
        searchCache.set(cacheKey, tracks);
        return tracks;
      }
    } catch (error) {
      console.warn(
        `[ironbeat:search] piped ${base} failed:`,
        error instanceof Error ? error.message : error,
      );
      markInstanceDown(base, 120_000, "search");
    }
  }

  for (const base of getCandidates("invidious", 3, "search")) {
    try {
      const tracks = await searchInvidious(base, normalized);
      reachableProvider = true;
      markInstanceHealthy(base, "search");

      if (tracks.length > 0) {
        searchCache.set(cacheKey, tracks);
        return tracks;
      }
    } catch (error) {
      console.warn(
        `[ironbeat:search] invidious ${base} failed:`,
        error instanceof Error ? error.message : error,
      );
      markInstanceDown(base, 120_000, "search");
    }
  }

  if (reachableProvider) {
    // Empty results are intentionally not cached: a provider can return an
    // empty page transiently, and a cached empty array would hide tracks that
    // are available moments later.
    return [];
  }

  throw new MusicServiceError(
    "Music search is temporarily unavailable. Please try again in a moment.",
    "unavailable",
  );
}

export async function resolveAudioStream(
  videoId: string,
  options: { refresh?: boolean; provider?: "piped" | "invidious" } = {},
): Promise<ResolvedStream> {
  const cacheKey = `${options.provider ?? "auto"}:${videoId}`;

  if (!options.refresh) {
    const cached = streamCache.get(cacheKey);
    if (cached) {
      return cached;
    }
  }

  const providers: Array<"piped" | "invidious"> = options.provider
    ? [options.provider]
    : ["invidious", "piped"];

  const attempted = new Set<string>();
  let lastError: unknown = null;

  for (const provider of providers) {
    for (const base of getCandidates(provider, 3, "stream")) {
      if (attempted.has(base)) {
        continue;
      }
      attempted.add(base);

      try {
        const resolved =
          provider === "piped"
            ? await resolvePipedStreams(base, videoId)
            : await resolveInvidiousStreams(base, videoId);

        markInstanceHealthy(base, "stream");
        streamCache.set(cacheKey, resolved);
        return resolved;
      } catch (error) {
        lastError = error;
        console.warn(
          `[ironbeat:stream] ${provider} ${base} failed for ${videoId}:`,
          error instanceof Error ? error.message : error,
        );
        if (shouldCoolDown(error)) {
          markInstanceDown(base, 90_000, "stream");
        }
      }
    }
  }

  if (lastError instanceof MusicServiceError) {
    throw lastError;
  }

  throw new MusicServiceError(
    "No playable audio stream is available for this track right now.",
    "unavailable",
  );
}

export { MusicServiceError } from "./types";
export type {
  MusicErrorCode,
  ResolvedStream,
  SearchFilter,
  StreamSource,
} from "./types";
