import { and, eq } from "drizzle-orm";
import type { NextRequest } from "next/server";

import { getDb } from "@/db";
import { playlistTracks, playlists } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth-server";
import {
  json,
  jsonError,
  notFound,
  unauthorized,
  withRouteErrorHandling,
} from "@/lib/http";
import { isSameOrigin } from "@/lib/request";
import { uuidSchema, videoIdSchema } from "@/lib/validators";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ playlistId: string; videoId: string }>;
};

export async function DELETE(request: NextRequest, context: RouteContext) {
  return withRouteErrorHandling(async () => {
    if (!isSameOrigin(request)) {
      return jsonError("Invalid request origin.", 403);
    }

    const user = await getCurrentUser();
    if (!user) {
      return unauthorized();
    }

    const { playlistId, videoId } = await context.params;
    const parsedId = uuidSchema.safeParse(playlistId);
    const parsedVideoId = videoIdSchema.safeParse(videoId);

    if (!parsedId.success || !parsedVideoId.success) {
      return notFound("That track is not in this playlist.");
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

    await db
      .delete(playlistTracks)
      .where(
        and(
          eq(playlistTracks.playlistId, playlist.id),
          eq(playlistTracks.userId, user.id),
          eq(playlistTracks.videoId, parsedVideoId.data),
        ),
      );

    await db
      .update(playlists)
      .set({ updatedAt: new Date() })
      .where(eq(playlists.id, playlist.id));

    return json({ ok: true });
  });
}
