import { and, count, eq, max } from "drizzle-orm";
import type { NextRequest } from "next/server";

import { getDb } from "@/db";
import { playlistTracks, playlists } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth-server";
import {
  json,
  jsonError,
  notFound,
  tooManyRequests,
  unauthorized,
  withRouteErrorHandling,
} from "@/lib/http";
import { checkRateLimit } from "@/lib/rate-limit";
import { isSameOrigin, readJson } from "@/lib/request";
import { normalizeTrack } from "@/lib/tracks";
import {
  firstIssue,
  trackEnvelopeSchema,
  uuidSchema,
} from "@/lib/validators";

export const dynamic = "force-dynamic";

const MAX_TRACKS_PER_PLAYLIST = 300;

type RouteContext = {
  params: Promise<{ playlistId: string }>;
};

export async function POST(request: NextRequest, context: RouteContext) {
  return withRouteErrorHandling(async () => {
    if (!isSameOrigin(request)) {
      return jsonError("Invalid request origin.", 403);
    }

    const user = await getCurrentUser();
    if (!user) {
      return unauthorized();
    }

    const limiter = checkRateLimit(`playlist-tracks:${user.id}`, 60, 60_000);
    if (!limiter.allowed) {
      return tooManyRequests(limiter.retryAfterSeconds);
    }

    const { playlistId } = await context.params;
    const parsedId = uuidSchema.safeParse(playlistId);
    if (!parsedId.success) {
      return notFound("That playlist does not exist.");
    }

    const parsed = trackEnvelopeSchema.safeParse(await readJson(request));
    if (!parsed.success) {
      return jsonError(firstIssue(parsed.error), 422);
    }

    const db = getDb();
    const [playlist] = await db
      .select({ id: playlists.id })
      .from(playlists)
      .where(
        and(
          eq(playlists.id, parsedId.data),
          eq(playlists.userId, user.id),
        ),
      )
      .limit(1);

    if (!playlist) {
      return notFound("That playlist does not exist.");
    }

    const [totals] = await db
      .select({
        total: count(),
        highestPosition: max(playlistTracks.position),
      })
      .from(playlistTracks)
      .where(eq(playlistTracks.playlistId, playlist.id));

    if (Number(totals?.total ?? 0) >= MAX_TRACKS_PER_PLAYLIST) {
      return jsonError(
        `This playlist is full (${MAX_TRACKS_PER_PLAYLIST} tracks).`,
        422,
      );
    }

    const track = normalizeTrack(parsed.data.track);
    const nextPosition = Number(totals?.highestPosition ?? -1) + 1;

    await db
      .insert(playlistTracks)
      .values({
        playlistId: playlist.id,
        userId: user.id,
        videoId: track.videoId,
        title: track.title,
        artist: track.artist,
        thumbnail: track.thumbnail,
        duration: track.duration,
        position: nextPosition,
      })
      .onConflictDoNothing({
        target: [playlistTracks.playlistId, playlistTracks.videoId],
      });

    await db
      .update(playlists)
      .set({ updatedAt: new Date() })
      .where(eq(playlists.id, playlist.id));

    return json({ track, added: true }, { status: 201 });
  });
}
