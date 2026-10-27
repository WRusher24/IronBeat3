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

  if (!source.proxied && source.kind === "audio" && isAac) {
    return 0;
  }
  if (!source.proxied && source.kind === "audio") {
    return 1;
  }
  if (!source.proxied && source.kind === "muxed") {
    return 2;
  }
  if (source.proxied && source.kind === "audio" && isAac) {
    return 3;
  }
  if (source.proxied && source.kind === "muxed") {
    return 4;
  }
  return 5;
}

/**
 * Server-side relay sources are fetched by Vercel, not the phone. Direct
 * googlevideo URLs are preferred there because the Invidious proxy itself can
 * be blocked from datacenter IPs. WebM/Opus is removed because Safari cannot
 * decode it.
 */
export function orderRelaySources(sources: StreamSource[]): StreamSource[] {
  return sources
    .filter(isSafariPlayableSource)
    .sort((a, b) => relayRank(a) - relayRank(b) || b.bitrate - a.bitrate)
    .slice(0, 10);
}
