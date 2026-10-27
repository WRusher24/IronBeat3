import type { Track } from "@/types";

import { TtlCache } from "./cache";
import {
  getCandidates,
  INVIDIOUS_INSTANCES,
  markInstanceDown,
  markInstanceHealthy,
  PIPED_INSTANCES,
} from "./instances";
import { resolveInvidiousStreams, searchInvidious } from "./invidious";
import { resolvePipedStreams, searchPiped, sortStreamSources } from "./piped";
import {
  MusicServiceError,
  type ResolvedStream,
  type SearchFilter,
  type StreamSource,
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
  options: {
    refresh?: boolean;
    provider?: "piped" | "invidious";
    includeDirect?: boolean;
  } = {},
): Promise<ResolvedStream> {
  const cacheKey = `${options.provider ?? "auto"}:${options.includeDirect ? "direct" : "local"}:${videoId}`;

  if (!options.refresh) {
    const cached = streamCache.get(cacheKey);
    if (cached) {
      return cached;
    }
  }

  const started = Date.now();
  const providers: Array<"piped" | "invidious"> = options.provider
    ? [options.provider]
    : ["invidious", "piped"];

  const attempts: Array<{
    provider: "piped" | "invidious";
    base: string;
    promise: Promise<ResolvedStream>;
  }> = [];

  for (const provider of providers) {
    // Stream resolution deliberately ignores cooldowns: with so few healthy
    // public instances, skipping the working one after a transient failure is
    // worse than retrying it in parallel. Search uses cooldowns separately.
    const bases =
      provider === "invidious"
        ? INVIDIOUS_INSTANCES.slice(0, options.includeDirect ? 3 : 5)
        : PIPED_INSTANCES.slice(0, 5);

    for (const base of bases) {
      attempts.push({
        provider,
        base,
        promise:
          provider === "piped"
            ? resolvePipedStreams(base, videoId)
            : resolveInvidiousStreams(base, videoId, {
                includeDirect: options.includeDirect,
              }),
      });
    }
  }

  const settled = await Promise.allSettled(
    attempts.map((attempt) => attempt.promise),
  );
  const successes: ResolvedStream[] = [];

  settled.forEach((result, index) => {
    const attempt = attempts[index];
    if (result.status === "fulfilled") {
      successes.push(result.value);
      markInstanceHealthy(attempt.base, "stream");
    } else {
      console.warn(
        `[ironbeat:stream] ${attempt.provider} ${attempt.base} failed for ${videoId}:`,
        result.reason instanceof Error ? result.reason.message : result.reason,
      );
      if (shouldCoolDown(result.reason)) {
        markInstanceDown(attempt.base, 60_000, "stream");
      }
    }
  });

  if (successes.length === 0) {
    throw new MusicServiceError(
      "No playable audio stream is available for this track right now.",
      "unavailable",
    );
  }

  const sourceMap = new Map<string, StreamSource>();
  for (const stream of successes) {
    for (const source of stream.sources) {
      if (!sourceMap.has(source.url)) {
        sourceMap.set(source.url, source);
      }
    }
  }

  const sources = sortStreamSources([...sourceMap.values()]).slice(0, 16);
  const primary = successes.find((stream) => stream.title) ?? successes[0];
  const resolved: ResolvedStream = {
    videoId,
    sources,
    title: primary.title,
    artist: primary.artist,
    duration: primary.duration,
    provider: primary.provider,
  };

  streamCache.set(cacheKey, resolved);
  console.log(
    `[ironbeat:stream] ${videoId} resolved in ${Date.now() - started}ms from ${successes.length}/${attempts.length} providers (${sources.length} media URLs)`,
  );

  return resolved;
}

export { MusicServiceError } from "./types";
export type {
  MusicErrorCode,
  ResolvedStream,
  SearchFilter,
  StreamSource,
} from "./types";
