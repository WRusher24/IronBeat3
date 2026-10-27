import type { Track } from "@/types";

export type StreamKind = "audio" | "muxed";

export type StreamSource = {
  url: string;
  mimeType: string;
  bitrate: number;
  kind: StreamKind;
  provider: "piped" | "invidious";
  label: string;
  proxied: boolean;
};

export type ResolvedStream = {
  videoId: string;
  sources: StreamSource[];
  title?: string;
  artist?: string;
  duration?: number;
  provider: "piped" | "invidious";
};

export type SearchFilter = "videos" | "music_songs" | "music_videos";

export type MusicErrorCode = "unavailable" | "blocked" | "no_audio" | "not_found";

export class MusicServiceError extends Error {
  readonly code: MusicErrorCode;

  constructor(message: string, code: MusicErrorCode = "unavailable") {
    super(message);
    this.name = "MusicServiceError";
    this.code = code;
  }
}

export type NormalizedTrack = Track;
