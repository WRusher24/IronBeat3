import { desc, eq } from "drizzle-orm";
import type { NextRequest } from "next/server";

import { getDb } from "@/db";
import { trackPlays } from "@/db/schema";
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

export async function GET(request: NextRequest) {
  return withRouteErrorHandling(async () => {
    const user = await getCurrentUser();
    if (!user) {
      return unauthorized();
    }

    const requested = Number(request.nextUrl.searchParams.get("limit") ?? 20);
    const limit = Number.isFinite(requested)
      ? Math.min(50, Math.max(1, Math.floor(requested)))
      : 20;

    const db = getDb();
    const rows = await db
      .select({
        videoId: trackPlays.videoId,
        title: trackPlays.title,
        artist: trackPlays.artist,
        thumbnail: trackPlays.thumbnail,
        duration: trackPlays.duration,
      })
      .from(trackPlays)
      .where(eq(trackPlays.userId, user.id))
      .orderBy(desc(trackPlays.playedAt))
      .limit(limit * 5);

    const seen = new Set<string>();
    const tracks: Track[] = [];

    for (const row of rows) {
      if (seen.has(row.videoId)) {
        continue;
      }
      seen.add(row.videoId);
      tracks.push(row);
      if (tracks.length >= limit) {
        break;
      }
    }

    return json({ tracks });
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

    const limiter = checkRateLimit(`plays:${user.id}`, 120, 60_000);
    if (!limiter.allowed) {
      return tooManyRequests(limiter.retryAfterSeconds);
    }

    const parsed = trackEnvelopeSchema.safeParse(await readJson(request));
    if (!parsed.success) {
      return jsonError(firstIssue(parsed.error), 422);
    }

    const track = normalizeTrack(parsed.data.track);
    const db = getDb();

    await db.insert(trackPlays).values({
      userId: user.id,
      videoId: track.videoId,
      title: track.title,
      artist: track.artist,
      thumbnail: track.thumbnail,
      duration: track.duration,
    });

    return json({ ok: true }, { status: 201 });
  });
}
