import { and, asc, eq } from "drizzle-orm";
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
import {
  firstIssue,
  updatePlaylistSchema,
  uuidSchema,
} from "@/lib/validators";
import type { PlaylistDetail } from "@/types";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ playlistId: string }>;
};

async function loadOwnedPlaylist(
  playlistId: string,
  userId: string,
) {
  const db = getDb();
  const [playlist] = await db
    .select({
      id: playlists.id,
      name: playlists.name,
      description: playlists.description,
      emoji: playlists.emoji,
      createdAt: playlists.createdAt,
      updatedAt: playlists.updatedAt,
    })
    .from(playlists)
    .where(and(eq(playlists.id, playlistId), eq(playlists.userId, userId)))
    .limit(1);

  return playlist ?? null;
}

export async function GET(_request: NextRequest, context: RouteContext) {
  return withRouteErrorHandling(async () => {
    const user = await getCurrentUser();
    if (!user) {
      return unauthorized();
    }

    const { playlistId } = await context.params;
    const parsedId = uuidSchema.safeParse(playlistId);
    if (!parsedId.success) {
      return notFound("That playlist does not exist.");
    }

    const playlist = await loadOwnedPlaylist(parsedId.data, user.id);
    if (!playlist) {
      return notFound("That playlist does not exist.");
    }

    const db = getDb();
    const tracks = await db
      .select({
        videoId: playlistTracks.videoId,
        title: playlistTracks.title,
        artist: playlistTracks.artist,
        thumbnail: playlistTracks.thumbnail,
        duration: playlistTracks.duration,
      })
      .from(playlistTracks)
      .where(eq(playlistTracks.playlistId, playlist.id))
      .orderBy(asc(playlistTracks.position), asc(playlistTracks.createdAt));

    const detail: PlaylistDetail = {
      id: playlist.id,
      name: playlist.name,
      description: playlist.description,
      emoji: playlist.emoji,
      createdAt: playlist.createdAt.toISOString(),
      updatedAt: playlist.updatedAt.toISOString(),
      tracks,
    };

    return json({ playlist: detail });
  });
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  return withRouteErrorHandling(async () => {
    if (!isSameOrigin(request)) {
      return jsonError("Invalid request origin.", 403);
    }

    const user = await getCurrentUser();
    if (!user) {
      return unauthorized();
    }

    const limiter = checkRateLimit(`playlist-edit:${user.id}`, 40, 60_000);
    if (!limiter.allowed) {
      return tooManyRequests(limiter.retryAfterSeconds);
    }

    const { playlistId } = await context.params;
    const parsedId = uuidSchema.safeParse(playlistId);
    if (!parsedId.success) {
      return notFound("That playlist does not exist.");
    }

    const parsed = updatePlaylistSchema.safeParse(await readJson(request));
    if (!parsed.success) {
      return jsonError(firstIssue(parsed.error), 422);
    }

    const existing = await loadOwnedPlaylist(parsedId.data, user.id);
    if (!existing) {
      return notFound("That playlist does not exist.");
    }

    const updates: {
      name?: string;
      description?: string;
      emoji?: string;
      updatedAt: Date;
    } = { updatedAt: new Date() };

    if (parsed.data.name !== undefined) {
      updates.name = parsed.data.name;
    }
    if (parsed.data.description !== undefined) {
      updates.description = parsed.data.description;
    }
    if (parsed.data.emoji !== undefined) {
      updates.emoji = parsed.data.emoji;
    }

    const db = getDb();
    const [updated] = await db
      .update(playlists)
      .set(updates)
      .where(and(eq(playlists.id, existing.id), eq(playlists.userId, user.id)))
      .returning({
        id: playlists.id,
        name: playlists.name,
        description: playlists.description,
        emoji: playlists.emoji,
        createdAt: playlists.createdAt,
        updatedAt: playlists.updatedAt,
      });

    if (!updated) {
      return notFound("That playlist does not exist.");
    }

    return json({
      playlist: {
        ...updated,
        createdAt: updated.createdAt.toISOString(),
        updatedAt: updated.updatedAt.toISOString(),
      },
    });
  });
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  return withRouteErrorHandling(async () => {
    if (!isSameOrigin(request)) {
      return jsonError("Invalid request origin.", 403);
    }

    const user = await getCurrentUser();
    if (!user) {
      return unauthorized();
    }

    const { playlistId } = await context.params;
    const parsedId = uuidSchema.safeParse(playlistId);
    if (!parsedId.success) {
      return notFound("That playlist does not exist.");
    }

    const db = getDb();
    const [deleted] = await db
      .delete(playlists)
      .where(
        and(eq(playlists.id, parsedId.data), eq(playlists.userId, user.id)),
      )
      .returning({ id: playlists.id });

    if (!deleted) {
      return notFound("That playlist does not exist.");
    }

    return json({ ok: true });
  });
}
