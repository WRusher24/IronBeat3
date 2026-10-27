import type { NextRequest } from "next/server";

import { getSessionClaims } from "@/lib/auth-server";
import { jsonError, unauthorized } from "@/lib/http";
import { MusicServiceError, resolveAudioStream } from "@/lib/music";
import { INVIDIOUS_INSTANCES } from "@/lib/music/instances";
import { USER_AGENT } from "@/lib/music/upstream";
import type { StreamSource } from "@/lib/music/types";
import { orderRelaySources } from "@/lib/relay-sources";
import { verifyStreamToken } from "@/lib/session";
import { readStreamCache, writeStreamCache } from "@/lib/stream-cache";
import { isVideoId } from "@/lib/tracks";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300;

type RouteContext = {
  params: Promise<{ videoId: string }>;
};

type OpenStream = {
  upstream: Response;
  source: StreamSource;
};

const RELAY_DEADLINE_MS = 22_000;
const SOURCE_TIMEOUT_MS = 7_000;

const FORWARDED_RESPONSE_HEADERS = [
  "content-type",
  "content-length",
  "content-range",
  "accept-ranges",
  "etag",
  "last-modified",
];

const loggedRelaySources = new Set<string>();

function hostOf(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return "invalid-host";
  }
}

function sourceFromToken(url: string): StreamSource {
  return {
    url,
    mimeType: "audio/mp4",
    bitrate: 0,
    kind: "audio",
    provider: "invidious",
    label: "relay token",
    proxied: false,
  };
}

function latestVersionSource(base: string, videoId: string): StreamSource {
  return {
    url: `${base}/latest_version?id=${videoId}&itag=140&local=true`,
    mimeType: "audio/mp4",
    bitrate: 128_000,
    kind: "audio",
    provider: "invidious",
    label: "latest_version 140",
    proxied: true,
  };
}

function relayCandidates(
  resolved: Awaited<ReturnType<typeof resolveAudioStream>>,
  videoId: string,
  tokenSourceUrl: string | null,
): StreamSource[] {
  const extras = INVIDIOUS_INSTANCES.slice(0, 4)
    .map((base) => latestVersionSource(base, videoId))
    .filter((source) => source.url !== tokenSourceUrl);

  return orderRelaySources([...resolved.sources, ...extras]).filter(
    (source) => source.url !== tokenSourceUrl,
  );
}

async function trySources(
  sources: StreamSource[],
  range: string | null,
  deadline: number,
): Promise<OpenStream | null> {
  for (const source of sources) {
    const remaining = deadline - Date.now();
    if (remaining < 500) {
      break;
    }

    const controller = new AbortController();
    const headerTimer = setTimeout(
      () => controller.abort(),
      Math.min(SOURCE_TIMEOUT_MS, remaining),
    );

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
        const sourceKey = `${source.provider}:${source.proxied ? "proxy" : "direct"}:${hostOf(source.url)}`;

        if (!loggedRelaySources.has(sourceKey)) {
          loggedRelaySources.add(sourceKey);
          console.log(`[ironbeat:relay] streaming via ${sourceKey}`);
        }

        return { upstream, source };
      }

      const status = upstream.status;
      await upstream.body?.cancel().catch(() => {});
      console.warn(
        `[ironbeat:relay] ${source.provider} ${source.proxied ? "proxy" : "direct"} ${hostOf(source.url)} returned ${status}`,
      );
    } catch (error) {
      clearTimeout(headerTimer);
      console.warn(
        `[ironbeat:relay] ${source.provider} ${source.proxied ? "proxy" : "direct"} ${hostOf(source.url)} failed:`,
        error instanceof Error ? error.message : error,
      );
    }
  }

  return null;
}

async function openUpstream(
  videoId: string,
  range: string | null,
  tokenSourceUrl: string | null,
): Promise<OpenStream | null> {
  const deadline = Date.now() + RELAY_DEADLINE_MS;

  // The signed relay URL normally carries the best resolved media URL. This is
  // the fast path for every Range request and avoids another provider lookup.
  if (tokenSourceUrl) {
    const opened = await trySources(
      [sourceFromToken(tokenSourceUrl)],
      range,
      deadline,
    );
    if (opened) {
      return opened;
    }
  }

  const cached = await readStreamCache(videoId);
  let resolved = cached;
  let wasFresh = false;

  if (!resolved) {
    try {
      resolved = await resolveAudioStream(videoId, { includeDirect: true });
      wasFresh = true;
      await writeStreamCache(resolved);
    } catch (error) {
      console.warn(
        `[ironbeat:relay] no sources for ${videoId}:`,
        error instanceof Error ? error.message : error,
      );
      return null;
    }
  }

  const opened = await trySources(
    relayCandidates(resolved, videoId, tokenSourceUrl),
    range,
    deadline,
  );
  if (opened) {
    return opened;
  }

  if (wasFresh || Date.now() > deadline - 5_000) {
    return null;
  }

  try {
    const fresh = await resolveAudioStream(videoId, {
      refresh: true,
      includeDirect: true,
    });
    await writeStreamCache(fresh);
    return await trySources(
      relayCandidates(fresh, videoId, tokenSourceUrl),
      range,
      deadline,
    );
  } catch (error) {
    console.warn(
      `[ironbeat:relay] refresh failed for ${videoId}:`,
      error instanceof Error ? error.message : error,
    );
    return null;
  }
}

function responseHeaders(upstream: Response, source: StreamSource): Headers {
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
  | { videoId: string; sourceUrl: string | null; error: null }
  | { videoId: null; sourceUrl: null; error: Response }
> {
  const { videoId } = await context.params;
  if (!isVideoId(videoId)) {
    return {
      videoId: null,
      sourceUrl: null,
      error: jsonError("That track id is not valid.", 422),
    };
  }

  const token = request.nextUrl.searchParams.get("token");
  const payload = await verifyStreamToken(token, videoId);

  if (payload) {
    return { videoId, sourceUrl: payload.sourceUrl, error: null };
  }

  const claims = await getSessionClaims();
  if (!claims) {
    return { videoId: null, sourceUrl: null, error: unauthorized() };
  }

  return { videoId, sourceUrl: null, error: null };
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
      auth.sourceUrl,
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
    const opened = await openUpstream(auth.videoId, "bytes=0-0", auth.sourceUrl);

    if (!opened) {
      return new Response(null, { status: 502 });
    }

    const headers = responseHeaders(opened.upstream, opened.source);
    const contentRange = opened.upstream.headers.get("content-range");
    const totalBytes = contentRange?.split("/")[1];

    await opened.upstream.body?.cancel().catch(() => {});

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
