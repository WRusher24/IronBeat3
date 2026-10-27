import { and, desc, eq } from "drizzle-orm";
import type { NextRequest } from "next/server";

import { getDb } from "@/db";
import { favorites } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth-server";
import {
  json,
  jsonError,
  tooManyRequests,
  unauthorized,
  withRouteErrorHandling,
} from "@/lib/http";
import { checkRateLimit } from "@/lib/rate-limit";
import { isSameOrigin, readJson } from "@/lib/request";
import { normalizeTrack } from "@/lib/tracks";
import { firstIssue, trackEnvelopeSchema } from "@/lib/validators";
import type { Track } from "@/types";

export const dynamic = "force-dynamic";

function clampLimit(value: string | null, fallback: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return Math.min(100, Math.max(1, Math.floor(parsed)));
}

export async function GET(request: NextRequest) {
  return withRouteErrorHandling(async () => {
    const user = await getCurrentUser();
    if (!user) {
      return unauthorized();
    }

    const limit = clampLimit(request.nextUrl.searchParams.get("limit"), 50);
    const db = getDb();
    const rows = await db
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
      .limit(limit);

    return json({ tracks: rows });
  });
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

    const limiter = checkRateLimit(`favorites:${user.id}`, 120, 60_000);
    if (!limiter.allowed) {
      return tooManyRequests(limiter.retryAfterSeconds);
    }

    const parsed = trackEnvelopeSchema.safeParse(await readJson(request));
    if (!parsed.success) {
      return jsonError(firstIssue(parsed.error), 422);
    }

    const track = normalizeTrack(parsed.data.track);
    const db = getDb();

    await db
      .insert(favorites)
      .values({
        userId: user.id,
        videoId: track.videoId,
        title: track.title,
        artist: track.artist,
        thumbnail: track.thumbnail,
        duration: track.duration,
      })
      .onConflictDoNothing({
        target: [favorites.userId, favorites.videoId],
      });

    return json({ track, favorited: true }, { status: 201 });
  });
}

export async function DELETE(request: NextRequest) {
  return withRouteErrorHandling(async () => {
    if (!isSameOrigin(request)) {
      return jsonError("Invalid request origin.", 403);
    }

    const user = await getCurrentUser();
    if (!user) {
      return unauthorized();
    }

    const videoId = request.nextUrl.searchParams.get("videoId");
    if (!videoId || !/^[A-Za-z0-9_-]{11}$/.test(videoId)) {
      return jsonError("That track id is not valid.", 422);
    }

    const db = getDb();
    await db
      .delete(favorites)
      .where(and(eq(favorites.userId, user.id), eq(favorites.videoId, videoId)));

    return json({ ok: true, favorited: false });
  });
}

export type { Track };
