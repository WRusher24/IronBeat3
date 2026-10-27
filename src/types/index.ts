import type { ThemeId } from "@/lib/theme";

export type Track = {
  videoId: string;
  title: string;
  artist: string;
  thumbnail: string;
  duration: number;
};

export type PublicUser = {
  id: string;
  email: string;
  displayName: string;
  theme: ThemeId;
  createdAt: string;
};

export type PlaylistSummary = {
  id: string;
  name: string;
  description: string;
  emoji: string;
  trackCount: number;
  createdAt: string;
  updatedAt: string;
};

export type PlaylistDetail = {
  id: string;
  name: string;
  description: string;
  emoji: string;
  tracks: Track[];
  createdAt: string;
  updatedAt: string;
};

export type SearchHistoryEntry = {
  query: string;
  uses: number;
  lastUsed: string;
};

export type MusicSearchResponse = {
  query: string;
  tracks: Track[];
};

export type SmartShuffleResponse = {
  tracks: Track[];
  basedOn: string[];
};
