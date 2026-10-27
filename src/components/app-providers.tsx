"use client";

import { FavoritesProvider } from "@/components/favorites-provider";

export function AppProviders({ children }: { children: React.ReactNode }) {
  return <FavoritesProvider>{children}</FavoritesProvider>;
}
