import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "IronBeat — Workout Music",
    short_name: "IronBeat",
    description:
      "Instant workout music for the gym floor. Search, tap a vibe, and keep the audio alive through every set.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#F5F2EC",
    theme_color: "#F5F2EC",
    categories: ["music", "health", "fitness", "entertainment"],
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      {
        name: "Instant Search",
        short_name: "Search",
        description: "Search a vibe and start playing immediately.",
        url: "/search",
        icons: [
          { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
        ],
      },
      {
        name: "Library",
        short_name: "Library",
        description: "Open playlists, favorites, and Smart Shuffle.",
        url: "/playlists",
      },
    ],
  };
}
