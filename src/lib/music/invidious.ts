import { thumbnailFor } from "@/lib/tracks";
import type { Track } from "@/types";

import {
  MusicServiceError,
  type ResolvedStream,
  type StreamSource,
} from "./types";
import { sortStreamSources } from "./piped";
import { absoluteUrl, fetchJson, hostOf } from "./upstream";

type InvidiousSearchItem = {
  type?: string;
  title?: string;
  videoId?: string;
  author?: string;
  lengthSeconds?: number;
  liveNow?: boolean;
  premium?: boolean;
  isUpcoming?: boolean;
};

type InvidiousFormat = {
  url?: string;
  type?: string;
  bitrate?: string | number;
  itag?: string | number;
  audioQuality?: string;
  qualityLabel?: string;
  contentLength?: string | number;
};

type InvidiousVideo = {
  title?: string;
  author?: string;
  lengthSeconds?: number;
  videoId?: string;
  error?: string;
  adaptiveFormats?: InvidiousFormat[];
  formatStreams?: InvidiousFormat[];
  liveNow?: boolean;
};

function containerOf(type: string): string {
  return type.split(";")[0]?.trim().toLowerCase() ?? "";
}

function bitrateOf(format: InvidiousFormat): number {
  const value = Number(format.bitrate ?? 0);
  return Number.isFinite(value) ? value : 0;
}

function isAudio(type: string): boolean {
  return type.startsWith("audio/");
}

function isMuxedVideo(type: string): boolean {
  const container = containerOf(type);
  return container === "video/mp4";
}

export async function searchInvidious(
  base: string,
  query: string,
): Promise<Track[]> {
  const url = new URL(`${base}/api/v1/search`);
  url.searchParams.set("q", query);
  url.searchParams.set("type", "video");
  url.searchParams.set("sort_by", "relevance");

  const payload = await fetchJson<InvidiousSearchItem[] | { error?: string }>(
    url.toString(),
    7_000,
  );

  if (!Array.isArray(payload)) {
    throw new MusicServiceError(
      payload.error ?? "Invidious returned an unexpected search payload.",
      "unavailable",
    );
  }

  const seen = new Set<string>();
  const tracks: Track[] = [];

  for (const item of payload) {
    if (item.type !== "video" || item.liveNow || item.premium || item.isUpcoming) {
      continue;
    }

    const videoId = item.videoId;
    if (!videoId || !/^[A-Za-z0-9_-]{11}$/.test(videoId) || seen.has(videoId)) {
      continue;
    }

    const duration = Math.round(Number(item.lengthSeconds ?? 0));
    if (!Number.isFinite(duration) || duration < 45) {
      continue;
    }

    seen.add(videoId);
    tracks.push({
      videoId,
      title: (item.title ?? "Untitled track").trim() || "Untitled track",
      artist: (item.author ?? "Unknown artist").trim() || "Unknown artist",
      thumbnail: thumbnailFor(videoId),
      duration,
    });

    if (tracks.length >= 20) {
      break;
    }
  }

  return tracks;
}

export async function resolveInvidiousStreams(
  base: string,
  videoId: string,
  options: { includeDirect?: boolean } = {},
): Promise<ResolvedStream> {
  const baseUrl = `${base}/api/v1/videos/${videoId}`;
  const localUrl = `${baseUrl}?local=true`;

  const [localResult, directResult] = await Promise.allSettled([
    fetchJson<InvidiousVideo>(localUrl, 6_000),
    options.includeDirect
      ? fetchJson<InvidiousVideo>(baseUrl, 6_000)
      : Promise.resolve(null),
  ]);

  const payloads: InvidiousVideo[] = [];
  let lastError: unknown = null;

  for (const result of [localResult, directResult]) {
    if (result.status === "rejected") {
      lastError = result.reason;
      continue;
    }

    const payload = result.value;
    if (!payload) {
      continue;
    }

    if (payload.error) {
      lastError = new MusicServiceError(
        payload.error,
        /login|bot|sign in|captcha/i.test(payload.error)
          ? "blocked"
          : /unavailable|does not exist|not found|private|removed|deleted|terminated/i.test(
                payload.error,
              )
            ? "no_audio"
            : "unavailable",
      );
      continue;
    }

    if (payload.videoId && payload.videoId !== videoId) {
      lastError = new MusicServiceError(
        "The audio provider returned the wrong video.",
      );
      continue;
    }

    if (payload.liveNow) {
      lastError = new MusicServiceError(
        "Live streams are not supported.",
        "no_audio",
      );
      continue;
    }

    payloads.push(payload);
  }

  if (payloads.length === 0) {
    if (lastError instanceof MusicServiceError) {
      throw lastError;
    }
    throw new MusicServiceError(
      "This instance could not resolve the track.",
      "unavailable",
    );
  }

  const sources: StreamSource[] = [];
  const seenUrls = new Set<string>();
  const baseHost = hostOf(base);

  for (const payload of payloads) {
    for (const format of payload.adaptiveFormats ?? []) {
      if (!format.url || !format.type || !isAudio(format.type)) {
        continue;
      }

      const resolvedUrl = absoluteUrl(format.url, base);
      if (seenUrls.has(resolvedUrl)) {
        continue;
      }
      seenUrls.add(resolvedUrl);

      sources.push({
        url: resolvedUrl,
        mimeType: containerOf(format.type),
        bitrate: bitrateOf(format),
        kind: "audio",
        provider: "invidious",
        label: format.audioQuality ?? `itag ${format.itag ?? "?"}`,
        proxied: Boolean(
          hostOf(resolvedUrl) && hostOf(resolvedUrl) === baseHost,
        ),
      });
    }

    for (const format of payload.formatStreams ?? []) {
      if (!format.url || !format.type || !isMuxedVideo(format.type)) {
        continue;
      }

      const resolvedUrl = absoluteUrl(format.url, base);
      if (seenUrls.has(resolvedUrl)) {
        continue;
      }
      seenUrls.add(resolvedUrl);

      sources.push({
        url: resolvedUrl,
        mimeType: containerOf(format.type),
        bitrate: bitrateOf(format),
        kind: "muxed",
        provider: "invidious",
        label: format.qualityLabel ?? "muxed",
        proxied: Boolean(
          hostOf(resolvedUrl) && hostOf(resolvedUrl) === baseHost,
        ),
      });
    }
  }

  if (sources.length === 0) {
    throw new MusicServiceError(
      "This instance could not expose an audio stream.",
      "no_audio",
    );
  }

  // A second, independent Invidious media endpoint. It redirects to the
  // instance's companion proxy host and is often reachable when the primary
  // API media URLs are blocked from datacenter IPs.
  sources.push({
    url: `${base}/latest_version?id=${videoId}&itag=140&local=true`,
    mimeType: "audio/mp4",
    bitrate: 128_000,
    kind: "audio",
    provider: "invidious",
    label: "latest_version 140",
    proxied: true,
  });

  const primary = payloads[0];
  const proxiedCount = sources.filter((source) => source.proxied).length;

  console.log(
    `[ironbeat:stream] invidious ${base} local=${localResult.status === "fulfilled"} direct=${directResult.status === "fulfilled"} proxied=${proxiedCount} total=${sources.length}`,
  );

  return {
    videoId,
    sources: sortStreamSources(sources).slice(0, 12),
    title: primary.title,
    artist: primary.author,
    duration: primary.lengthSeconds,
    provider: "invidious",
  };
}
