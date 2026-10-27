import type { NextRequest } from "next/server";

import { getSessionClaims } from "@/lib/auth-server";
import { jsonError, unauthorized } from "@/lib/http";
import { MusicServiceError, resolveAudioStream } from "@/lib/music";
import { USER_AGENT } from "@/lib/music/upstream";
import { readStreamTokenSources } from "@/lib/session";
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

// Try the top sources at once and keep the first that answers, so a stalled
// source does not hold up the others for its full header timeout.
async function trySources(
  sources: OpenStream["source"][],
  range: string | null,
): Promise<OpenStream | null> {
  const controllers = new Map<OpenStream["source"], AbortController>();

  const attempt = async (source: OpenStream["source"]): Promise<OpenStream> => {
    const controller = new AbortController();
    controllers.set(source, controller);
    const headerTimer = setTimeout(() => controller.abort(), 10_000);

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

      if (upstream.ok || upstream.status === 206) {
        return { upstream, source };
      }

      await upstream.body?.cancel().catch(() => {});
      throw new Error(`Upstream responded with ${upstream.status}.`);
    } finally {
      clearTimeout(headerTimer);
    }
  };

  try {
    const winner = await Promise.any(sources.slice(0, 3).map(attempt));
    for (const [source, controller] of controllers) {
      if (source !== winner.source) {
        controller.abort();
      }
    }
    return winner;
  } catch {
    return null;
  }
}

async function openUpstream(
  videoId: string,
  range: string | null,
  knownUrls: string[] = [],
): Promise<OpenStream | null> {
  if (knownUrls.length > 0) {
    const direct = await trySources(
      knownUrls.map((url) => ({ url, mimeType: "audio/mp4" }) as OpenStream["source"]),
      range,
    );
    if (direct) {
      return direct;
    }
  }

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

function parseRange(
  range: string | null,
  total: number,
): { start: number; end: number } | null {
  const match = range?.match(/^bytes=(\d*)-(\d*)$/i);
  if (!match || total <= 0 || (!match[1] && !match[2])) {
    return null;
  }

  let start: number;
  let end: number;
  if (!match[1]) {
    start = Math.max(0, total - Number(match[2]));
    end = total - 1;
  } else {
    start = Number(match[1]);
    end = match[2] ? Math.min(Number(match[2]), total - 1) : total - 1;
  }

  return start <= end && start < total ? { start, end } : null;
}

// iOS Safari only plays media from servers that answer Range requests with a
// proper 206. Some upstreams ignore Range and return the whole file with 200,
// so slice the stream here to honour the request.
function sliceToRange(
  upstream: Response,
  headers: Headers,
  range: string | null,
): Response | null {
  const total = Number(upstream.headers.get("content-length") ?? 0);
  const parsed = upstream.body ? parseRange(range, total) : null;
  if (!parsed || !upstream.body) {
    return null;
  }

  const { start, end } = parsed;
  let position = 0;
  const slicer = new TransformStream<Uint8Array, Uint8Array>({
    transform(chunk, controller) {
      const chunkStart = position;
      position += chunk.byteLength;
      if (position <= start || chunkStart > end) {
        return;
      }
      controller.enqueue(
        chunk.subarray(
          Math.max(0, start - chunkStart),
          Math.min(chunk.byteLength, end + 1 - chunkStart),
        ),
      );
      if (position > end) {
        controller.terminate();
      }
    },
  });

  headers.set("Content-Range", `bytes ${start}-${end}/${total}`);
  headers.set("Content-Length", String(end - start + 1));

  return new Response(upstream.body.pipeThrough(slicer), {
    status: 206,
    headers,
  });
}

async function authorize(
  request: NextRequest,
  context: RouteContext,
): Promise<
  | { videoId: string; knownUrls: string[]; error: null }
  | { videoId: null; knownUrls: string[]; error: Response }
> {
  const { videoId } = await context.params;
  if (!isVideoId(videoId)) {
    return {
      videoId: null,
      knownUrls: [],
      error: jsonError("That track id is not valid.", 422),
    };
  }

  const token = request.nextUrl.searchParams.get("token");
  const knownUrls = await readStreamTokenSources(token, videoId);

  if (!knownUrls) {
    const claims = await getSessionClaims();
    if (!claims) {
      return { videoId: null, knownUrls: [], error: unauthorized() };
    }
  }

  return { videoId, knownUrls: knownUrls ?? [], error: null };
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
      auth.knownUrls,
    );

    if (!opened) {
      return jsonError(
        "The audio relay could not reach a playable stream. Try another track.",
        502,
      );
    }

    const headers = responseHeaders(opened.upstream, opened.source);
    const range = request.headers.get("range");

    if (range && opened.upstream.status === 200) {
      const sliced = sliceToRange(opened.upstream, headers, range);
      if (sliced) {
        return sliced;
      }
    }

    return new Response(opened.upstream.body, {
      status: opened.upstream.status,
      headers,
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
    const opened = await openUpstream(auth.videoId, "bytes=0-0", auth.knownUrls);

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
