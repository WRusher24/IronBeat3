import { count, desc, eq } from "drizzle-orm";
import type { NextRequest } from "next/server";

import { getDb } from "@/db";
import { playlistTracks, playlists } from "@/db/schema";
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
import { createPlaylistSchema, firstIssue } from "@/lib/validators";
import type { PlaylistSummary } from "@/types";

export const dynamic = "force-dynamic";

const MAX_PLAYLISTS_PER_USER = 30;

export async function GET() {
  return withRouteErrorHandling(async () => {
    const user = await getCurrentUser();
    if (!user) {
      return unauthorized();
    }

    const db = getDb();
    const rows = await db
      .select({
        id: playlists.id,
        name: playlists.name,
        description: playlists.description,
        emoji: playlists.emoji,
        createdAt: playlists.createdAt,
        updatedAt: playlists.updatedAt,
        trackCount: count(playlistTracks.id),
      })
      .from(playlists)
      .leftJoin(playlistTracks, eq(playlistTracks.playlistId, playlists.id))
      .where(eq(playlists.userId, user.id))
      .groupBy(playlists.id)
      .orderBy(desc(playlists.createdAt));

    const summaries: PlaylistSummary[] = rows.map((row) => ({
      id: row.id,
      name: row.name,
      description: row.description,
      emoji: row.emoji,
      trackCount: Number(row.trackCount ?? 0),
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    }));

    return json({ playlists: summaries });
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

    const limiter = checkRateLimit(`playlists:${user.id}`, 30, 60_000);
    if (!limiter.allowed) {
      return tooManyRequests(limiter.retryAfterSeconds);
    }

    const parsed = createPlaylistSchema.safeParse(await readJson(request));
    if (!parsed.success) {
      return jsonError(firstIssue(parsed.error), 422);
    }

    const db = getDb();
    const [existing] = await db
      .select({ total: count() })
      .from(playlists)
      .where(eq(playlists.userId, user.id));

    if (Number(existing?.total ?? 0) >= MAX_PLAYLISTS_PER_USER) {
      return jsonError(
        `You can keep up to ${MAX_PLAYLISTS_PER_USER} playlists. Delete one to make room.`,
        422,
      );
    }

    const [created] = await db
      .insert(playlists)
      .values({
        userId: user.id,
        name: parsed.data.name,
        description: parsed.data.description,
        emoji: parsed.data.emoji,
      })
      .returning({
        id: playlists.id,
        name: playlists.name,
        description: playlists.description,
        emoji: playlists.emoji,
        createdAt: playlists.createdAt,
        updatedAt: playlists.updatedAt,
      });

    if (!created) {
      throw new Error("Playlist insert returned no row.");
    }

    const playlist: PlaylistSummary = {
      ...created,
      trackCount: 0,
      createdAt: created.createdAt.toISOString(),
      updatedAt: created.updatedAt.toISOString(),
    };

    return json({ playlist }, { status: 201 });
  });
}
