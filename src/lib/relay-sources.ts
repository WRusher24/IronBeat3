import type { StreamSource } from "@/lib/music/types";

function containerOf(mimeType: string): string {
  return mimeType.split(";")[0]?.trim().toLowerCase() ?? "";
}

export function isSafariPlayableSource(source: StreamSource): boolean {
  const container = containerOf(source.mimeType);
  return (
    container === "audio/mp4" ||
    container === "audio/x-m4a" ||
    container === "audio/aac" ||
    container === "audio/mpeg" ||
    container === "audio/mp3" ||
    (source.kind === "muxed" && container === "video/mp4")
  );
}

function relayRank(source: StreamSource): number {
  const container = containerOf(source.mimeType);
  const isAac = container !== "video/mp4";

  // `/latest_version` redirects through a separate Invidious companion proxy
  // host, so it is tried before the primary API media URLs.
  if (source.proxied && source.label.startsWith("latest_version")) {
    return -1;
  }

  // The relay runs on Vercel. Direct googlevideo fetches from that egress IP
  // are frequently rejected with 403. Source URLs served by the Invidious or
  // Piped proxy are fetched from a non-YouTube host and are the reliable path.
  if (source.proxied && source.kind === "audio" && isAac) {
    return 0;
  }
  if (source.proxied && source.kind === "muxed") {
    return 1;
  }
  if (!source.proxied && source.kind === "audio" && isAac) {
    return 2;
  }
  if (!source.proxied && source.kind === "muxed") {
    return 3;
  }
  return 4;
}

/**
 * Server-side relay sources are fetched by Vercel, not the phone. Proxied
 * AAC/MP4 URLs are preferred because YouTube blocks direct media fetches from
 * datacenter IPs. WebM/Opus is removed because Safari cannot decode it.
 */
export function orderRelaySources(sources: StreamSource[]): StreamSource[] {
  return sources
    .filter(isSafariPlayableSource)
    .sort((a, b) => relayRank(a) - relayRank(b) || b.bitrate - a.bitrate)
    .slice(0, 10);
}
