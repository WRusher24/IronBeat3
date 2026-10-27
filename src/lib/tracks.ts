import type { Track } from "@/types";

export type TrackInput = {
  videoId: string;
  title: string;
  artist: string;
  duration: number;
};

export function thumbnailFor(videoId: string): string {
  return `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
}

export function isVideoId(value: string): boolean {
  return /^[A-Za-z0-9_-]{11}$/.test(value);
}

export function normalizeTrack(input: TrackInput): Track {
  const duration = Math.round(Number(input.duration ?? 0));

  return {
    videoId: input.videoId,
    title: input.title.trim() || "Untitled track",
    artist: input.artist.trim() || "Unknown artist",
    thumbnail: thumbnailFor(input.videoId),
    duration: Number.isFinite(duration) && duration > 0 ? duration : 0,
  };
}

export function isTrackLike(value: unknown): value is Track {
  if (!value || typeof value !== "object") {
    return false;
  }

  const track = value as Partial<Track>;
  return (
    typeof track.videoId === "string" &&
    isVideoId(track.videoId) &&
    typeof track.title === "string" &&
    typeof track.artist === "string" &&
    typeof track.duration === "number"
  );
}

export function dedupeTracks(tracks: Track[]): Track[] {
  const seen = new Set<string>();
  const result: Track[] = [];

  for (const track of tracks) {
    if (seen.has(track.videoId)) {
      continue;
    }
    seen.add(track.videoId);
    result.push(track);
  }

  return result;
}

export function shuffleTracks(tracks: Track[]): Track[] {
  const copy = [...tracks];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }
  return copy;
}
