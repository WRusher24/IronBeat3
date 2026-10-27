import { thumbnailFor } from "@/lib/tracks";
import type { Track } from "@/types";

import {
  MusicServiceError,
  type SearchFilter,
  type ResolvedStream,
  type StreamSource,
} from "./types";
import { absoluteUrl, fetchJson, hostOf } from "./upstream";

type PipedSearchItem = {
  url?: string;
  type?: string;
  title?: string;
  uploaderName?: string;
  duration?: number;
  isShort?: boolean;
};

type PipedSearchResponse = {
  items?: PipedSearchItem[];
  error?: string;
  message?: string;
};

type PipedStream = {
  url?: string;
  mimeType?: string;
  format?: string;
  quality?: string;
  bitrate?: number;
  videoOnly?: boolean;
  contentLength?: number;
};

type PipedStreamsResponse = {
  title?: string;
  uploader?: string;
  duration?: number;
  audioStreams?: PipedStream[];
  videoStreams?: PipedStream[];
  hls?: string | null;
  error?: string;
  message?: string;
};

const VIDEO_ID_PATTERN = /[?&]v=([A-Za-z0-9_-]{11})/;

function extractVideoId(url: string | undefined): string | null {
  if (!url) {
    return null;
  }

  const match = url.match(VIDEO_ID_PATTERN);
  return match?.[1] ?? null;
}

function containerOf(mimeType: string): string {
  return mimeType.split(";")[0]?.trim().toLowerCase() ?? "";
}

function isPlayableMuxedContainer(mimeType: string): boolean {
  const container = containerOf(mimeType);
  return container === "video/mp4" || container === "audio/mp4";
}

function isProxied(url: string, base: string): boolean {
  const host = hostOf(url);
  const baseHost = hostOf(base);
  return Boolean(host && baseHost && host === baseHost);
}

function sourceRank(source: StreamSource): number {
  const container = containerOf(source.mimeType);
  const isAac = container === "audio/mp4" || container === "audio/x-m4a" || container === "audio/aac";
  const isMp3 = container === "audio/mpeg" || container === "audio/mp3";

  if (source.kind === "audio" && isAac) {
    return source.proxied ? 0 : 1;
  }
  if (source.kind === "muxed") {
    return source.proxied ? 2 : 3;
  }
  if (source.kind === "audio" && isMp3) {
    return source.proxied ? 4 : 5;
  }
  return source.proxied ? 6 : 7;
}

export function sortStreamSources(sources: StreamSource[]): StreamSource[] {
  return [...sources].sort((a, b) => {
    const rank = sourceRank(a) - sourceRank(b);
    if (rank !== 0) {
      return rank;
    }
    return b.bitrate - a.bitrate;
  });
}

export async function searchPiped(
  base: string,
  query: string,
  filter: SearchFilter,
): Promise<Track[]> {
  const url = new URL(`${base}/search`);
  url.searchParams.set("q", query);
  url.searchParams.set("filter", filter);

  const payload = await fetchJson<PipedSearchResponse>(url.toString(), 7_000);

  if (payload.error || payload.message) {
    throw new MusicServiceError(
      payload.error ?? payload.message ?? "Piped search failed.",
      "unavailable",
    );
  }

  if (!Array.isArray(payload.items)) {
    throw new MusicServiceError("Piped returned an unexpected search payload.");
  }

  const seen = new Set<string>();
  const tracks: Track[] = [];

  for (const item of payload.items) {
    if (item.type !== "stream" || item.isShort) {
      continue;
    }

    const videoId = extractVideoId(item.url);
    if (!videoId || seen.has(videoId)) {
      continue;
    }

    const duration = Math.round(Number(item.duration ?? 0));
    if (!Number.isFinite(duration) || duration < 45) {
      continue;
    }

    seen.add(videoId);
    tracks.push({
      videoId,
      title: (item.title ?? "Untitled track").trim() || "Untitled track",
      artist: (item.uploaderName ?? "Unknown artist").trim() || "Unknown artist",
      thumbnail: thumbnailFor(videoId),
      duration,
    });

    if (tracks.length >= 20) {
      break;
    }
  }

  return tracks;
}

export async function resolvePipedStreams(
  base: string,
  videoId: string,
): Promise<ResolvedStream> {
  const payload = await fetchJson<PipedStreamsResponse>(
    `${base}/streams/${videoId}`,
    5_000,
  );

  if (payload.error || payload.message) {
    const message = payload.error ?? payload.message ?? "";
    const blocked = /LOGIN_REQUIRED|not a bot|SignInConfirmNotBot/i.test(message);
    const unavailable =
      /unavailable|does not exist|not found|private|removed|deleted|terminated/i.test(
        message,
      );

    throw new MusicServiceError(
      blocked
        ? "This instance is blocked by the source."
        : unavailable
          ? "This video is unavailable."
          : "Stream lookup failed.",
      blocked ? "blocked" : unavailable ? "no_audio" : "unavailable",
    );
  }

  const sources: StreamSource[] = [];

  for (const stream of payload.audioStreams ?? []) {
    if (!stream.url) {
      continue;
    }

    sources.push({
      url: absoluteUrl(stream.url, base),
      mimeType: stream.mimeType ?? "audio/mp4",
      bitrate: Number(stream.bitrate ?? 0),
      kind: "audio",
      provider: "piped",
      label: stream.format ?? stream.quality ?? "audio",
      proxied: isProxied(absoluteUrl(stream.url, base), base),
    });
  }

  if (sources.length === 0) {
    for (const stream of payload.videoStreams ?? []) {
      if (!stream.url || stream.videoOnly !== false) {
        continue;
      }
      if (!isPlayableMuxedContainer(stream.mimeType ?? "")) {
        continue;
      }

      const resolvedUrl = absoluteUrl(stream.url, base);
      sources.push({
        url: resolvedUrl,
        mimeType: stream.mimeType ?? "video/mp4",
        bitrate: Number(stream.bitrate ?? 0),
        kind: "muxed",
        provider: "piped",
        label: stream.quality ?? "muxed",
        proxied: isProxied(resolvedUrl, base),
      });
    }
  }

  if (sources.length === 0) {
    throw new MusicServiceError(
      "This instance could not expose an audio stream.",
      "no_audio",
    );
  }

  return {
    videoId,
    sources: sortStreamSources(sources).slice(0, 8),
    title: payload.title,
    artist: payload.uploader,
    duration: payload.duration,
    provider: "piped",
  };
}
