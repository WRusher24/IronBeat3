import { and, eq, gt, lt } from "drizzle-orm";

import { getDb } from "@/db";
import { streamSources } from "@/db/schema";
import type { ResolvedStream, StreamSource } from "@/lib/music/types";

const CACHE_TTL_MS = 15 * 60_000;
const RETRY_AFTER_FAILURE_MS = 5 * 60_000;

let cacheDisabledUntil = 0;

function cacheIsAvailable(): boolean {
  return Date.now() >= cacheDisabledUntil;
}

function disableCache(error: unknown): void {
  cacheDisabledUntil = Date.now() + RETRY_AFTER_FAILURE_MS;
  const message = error instanceof Error ? error.message : String(error);

  if (/stream_sources.*does not exist|relation .*stream_sources/i.test(message)) {
    console.warn(
      "[ironbeat:stream-cache] stream_sources table is missing. Run `npm run db:migrate`. Playback continues without the shared cache.",
    );
    return;
  }

  console.warn(
    "[ironbeat:stream-cache] Cache unavailable; resolving every request:",
    message,
  );
}

export async function readStreamCache(
  videoId: string,
): Promise<ResolvedStream | null> {
  if (!cacheIsAvailable()) {
    return null;
  }

  try {
    const db = getDb();
    const [row] = await db
      .select({
        sources: streamSources.sources,
        title: streamSources.title,
        artist: streamSources.artist,
        duration: streamSources.duration,
      })
      .from(streamSources)
      .where(
        and(
          eq(streamSources.videoId, videoId),
          gt(streamSources.expiresAt, new Date()),
        ),
      )
      .limit(1);

    if (!row || !Array.isArray(row.sources) || row.sources.length === 0) {
      return null;
    }

    return {
      videoId,
      sources: row.sources as StreamSource[],
      title: row.title ?? undefined,
      artist: row.artist ?? undefined,
      duration: row.duration ?? undefined,
      provider: row.sources[0]?.provider ?? "invidious",
    };
  } catch (error) {
    disableCache(error);
    return null;
  }
}

export async function writeStreamCache(resolved: ResolvedStream): Promise<void> {
  if (!cacheIsAvailable() || resolved.sources.length === 0) {
    return;
  }

  try {
    const db = getDb();
    const expiresAt = new Date(Date.now() + CACHE_TTL_MS);

    await db
      .insert(streamSources)
      .values({
        videoId: resolved.videoId,
        sources: resolved.sources,
        title: resolved.title ?? null,
        artist: resolved.artist ?? null,
        duration: resolved.duration ?? null,
        expiresAt,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: streamSources.videoId,
        set: {
          sources: resolved.sources,
          title: resolved.title ?? null,
          artist: resolved.artist ?? null,
          duration: resolved.duration ?? null,
          expiresAt,
          updatedAt: new Date(),
        },
      });

    if (Math.random() < 0.1) {
      void db
        .delete(streamSources)
        .where(lt(streamSources.expiresAt, new Date()))
        .catch(() => {
          // Cache cleanup is best-effort.
        });
    }
  } catch (error) {
    disableCache(error);
  }
}
