import type { NextRequest } from "next/server";

import { getSessionClaims } from "@/lib/auth-server";
import { jsonError, unauthorized } from "@/lib/http";
import { MusicServiceError, resolveAudioStream } from "@/lib/music";
import { USER_AGENT } from "@/lib/music/upstream";
import { verifyStreamToken } from "@/lib/session";
import { isVideoId } from "@/lib/tracks";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300;

type RouteContext = {
  params: Promise<{ videoId: string }>;
};

type OpenStream = {
  upstream: Response;
  source: Awaited<ReturnType<typeof resolveAudioStream>>["sources"][number];
};

const FORWARDED_RESPONSE_HEADERS = [
  "content-type",
  "content-length",
  "content-range",
  "accept-ranges",
  "etag",
  "last-modified",
];

async function trySources(
  sources: OpenStream["source"][],
  range: string | null,
): Promise<OpenStream | null> {
  for (const source of sources) {
    const controller = new AbortController();
    const headerTimer = setTimeout(() => controller.abort(), 12_000);

    try {
      const upstream = await fetch(source.url, {
        method: "GET",
        redirect: "follow",
        cache: "no-store",
        signal: controller.signal,
        headers: {
          Accept: "*/*",
          "User-Agent": USER_AGENT,
          ...(range ? { Range: range } : {}),
        },
      });

      clearTimeout(headerTimer);

      if (upstream.ok || upstream.status === 206) {
        return { upstream, source };
      }

      await upstream.body?.cancel().catch(() => {});
    } catch {
      clearTimeout(headerTimer);
    }
  }

  return null;
}

async function openUpstream(
  videoId: string,
  range: string | null,
): Promise<OpenStream | null> {
  try {
    const primary = await resolveAudioStream(videoId);
    const primaryResult = await trySources(primary.sources, range);
    if (primaryResult) {
      return primaryResult;
    }
  } catch {
    // Fall through to the Piped-backed resolution.
  }

  try {
    const fallback = await resolveAudioStream(videoId, {
      refresh: true,
      provider: "piped",
    });
    return await trySources(fallback.sources, range);
  } catch {
    return null;
  }
}

function responseHeaders(
  upstream: Response,
  source: OpenStream["source"],
): Headers {
  const headers = new Headers();

  for (const name of FORWARDED_RESPONSE_HEADERS) {
    const value = upstream.headers.get(name);
    if (value) {
      headers.set(name, value);
    }
  }

  headers.set(
    "Content-Type",
    upstream.headers.get("content-type") || source.mimeType || "audio/mp4",
  );
  headers.set("Accept-Ranges", "bytes");
  headers.set("Cache-Control", "no-store");
  headers.set("Content-Disposition", "inline");
  headers.set("X-Content-Type-Options", "nosniff");

  return headers;
}

async function authorize(
  request: NextRequest,
  context: RouteContext,
): Promise<
  | { videoId: string; error: null }
  | { videoId: null; error: Response }
> {
  const { videoId } = await context.params;
  if (!isVideoId(videoId)) {
    return {
      videoId: null,
      error: jsonError("That track id is not valid.", 422),
    };
  }

  const token = request.nextUrl.searchParams.get("token");
  const tokenValid = await verifyStreamToken(token, videoId);

  if (!tokenValid) {
    const claims = await getSessionClaims();
    if (!claims) {
      return { videoId: null, error: unauthorized() };
    }
  }

  return { videoId, error: null };
}

export async function GET(request: NextRequest, context: RouteContext) {
  const auth = await authorize(request, context);
  if (auth.error) {
    return auth.error;
  }

  try {
    const opened = await openUpstream(
      auth.videoId,
      request.headers.get("range"),
    );

    if (!opened) {
      return jsonError(
        "The audio relay could not reach a playable stream. Try another track.",
        502,
      );
    }

    return new Response(opened.upstream.body, {
      status: opened.upstream.status,
      headers: responseHeaders(opened.upstream, opened.source),
    });
  } catch (error) {
    if (error instanceof MusicServiceError) {
      return jsonError(
        error.message,
        error.code === "no_audio" || error.code === "not_found" ? 422 : 503,
      );
    }
    console.error("[ironbeat:relay]", error);
    return jsonError("The audio relay failed. Try another track.", 502);
  }
}

export async function HEAD(request: NextRequest, context: RouteContext) {
  const auth = await authorize(request, context);
  if (auth.error) {
    return auth.error;
  }

  try {
    const opened = await openUpstream(auth.videoId, "bytes=0-0");

    if (!opened) {
      return new Response(null, { status: 502 });
    }

    const headers = responseHeaders(opened.upstream, opened.source);
    const contentRange = opened.upstream.headers.get("content-range");
    const totalBytes = contentRange?.split("/")[1];

    await opened.upstream.body?.cancel().catch(() => {});

    // Present HEAD like a normal media probe: full length, no partial range.
    headers.delete("content-length");
    headers.delete("content-range");
    if (totalBytes && /^\d+$/.test(totalBytes)) {
      headers.set("Content-Length", totalBytes);
    }

    return new Response(null, {
      status: 200,
      headers,
    });
  } catch {
    return new Response(null, { status: 502 });
  }
}
