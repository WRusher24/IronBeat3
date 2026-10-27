import type { NextRequest } from "next/server";

import { getSessionClaims } from "@/lib/auth-server";
import {
  json,
  jsonError,
  tooManyRequests,
  unauthorized,
  withRouteErrorHandling,
} from "@/lib/http";
import { MusicServiceError, resolveAudioStream } from "@/lib/music";
import { checkRateLimit } from "@/lib/rate-limit";
import { orderRelaySources } from "@/lib/relay-sources";
import { createStreamToken } from "@/lib/session";
import { readStreamCache, writeStreamCache } from "@/lib/stream-cache";
import { isVideoId } from "@/lib/tracks";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ videoId: string }>;
};

export async function GET(request: NextRequest, context: RouteContext) {
  return withRouteErrorHandling(async () => {
    const claims = await getSessionClaims();
    if (!claims) {
      return unauthorized();
    }

    const limiter = checkRateLimit(`audio:${claims.userId}`, 80, 60_000);
    if (!limiter.allowed) {
      return tooManyRequests(limiter.retryAfterSeconds);
    }

    const { videoId } = await context.params;
    if (!isVideoId(videoId)) {
      return jsonError("That track id is not valid.", 422);
    }

    const refresh = request.nextUrl.searchParams.get("refresh") === "1";
    const providerParam = request.nextUrl.searchParams.get("provider");
    const provider =
      providerParam === "piped" || providerParam === "invidious"
        ? providerParam
        : undefined;

    try {
      const forceRefresh = refresh || Boolean(provider);
      let resolved = forceRefresh ? null : await readStreamCache(videoId);

      if (!resolved) {
        resolved = await resolveAudioStream(videoId, {
          refresh: forceRefresh,
          provider,
          includeDirect: true,
        });
        await writeStreamCache(resolved);
      }

      const sources = resolved.sources
        .filter((source) => /^https?:\/\//i.test(source.url))
        .map((source) => ({
          url: source.url,
          mimeType: source.mimeType,
          kind: source.kind,
          bitrate: source.bitrate,
          label: source.label,
          proxied: source.proxied,
        }));

      if (sources.length === 0) {
        return jsonError(
          "No playable audio stream is available for this track.",
          422,
        );
      }

      // Put the best relay source inside the signed token. Subsequent range
      // requests then stream immediately instead of re-resolving providers.
      const bestRelaySource = orderRelaySources(resolved.sources)[0];
      const proxyToken = await createStreamToken(
        videoId,
        bestRelaySource?.url ?? null,
      );
      const proxyUrl = `/api/audio/${videoId}/stream?token=${encodeURIComponent(proxyToken)}`;

      return json({
        videoId,
        sources,
        proxyUrl,
        title: resolved.title ?? null,
        artist: resolved.artist ?? null,
        duration: resolved.duration ?? null,
      });
    } catch (error) {
      if (error instanceof MusicServiceError) {
        return jsonError(
          error.message,
          error.code === "no_audio" || error.code === "not_found" ? 422 : 503,
        );
      }
      throw error;
    }
  });
}
