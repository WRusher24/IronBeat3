"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { apiFetch, errorMessage } from "@/lib/client-api";
import { useToast } from "@/components/ui/toast";
import type { Track } from "@/types";

type FavoritesContextValue = {
  favorites: Track[];
  loading: boolean;
  pendingIds: Set<string>;
  isFavorite: (videoId: string) => boolean;
  toggle: (track: Track) => Promise<void>;
  refresh: () => Promise<void>;
};

const FavoritesContext = createContext<FavoritesContextValue | null>(null);

export function FavoritesProvider({ children }: { children: ReactNode }) {
  const [favorites, setFavorites] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch<{ tracks: Track[] }>("/api/favorites?limit=100");
      setFavorites(data.tracks);
    } catch {
      // Guests and transient failures simply start with an empty collection.
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const favoriteIds = useMemo(
    () => new Set(favorites.map((track) => track.videoId)),
    [favorites],
  );

  const isFavorite = useCallback(
    (videoId: string) => favoriteIds.has(videoId),
    [favoriteIds],
  );

  const toggle = useCallback(
    async (track: Track) => {
      const currentlyFavorited = favoriteIds.has(track.videoId);

      setPendingIds((current) => {
        const next = new Set(current);
        next.add(track.videoId);
        return next;
      });

      setFavorites((current) =>
        currentlyFavorited
          ? current.filter((item) => item.videoId !== track.videoId)
          : [track, ...current.filter((item) => item.videoId !== track.videoId)],
      );

      try {
        if (currentlyFavorited) {
          await apiFetch<{ ok: boolean }>(
            `/api/favorites?videoId=${encodeURIComponent(track.videoId)}`,
            { method: "DELETE" },
          );
          toast("Removed from favorites");
        } else {
          await apiFetch<{ track: Track }>("/api/favorites", {
            method: "POST",
            body: JSON.stringify({ track }),
          });
          toast("Saved to favorites", "success");
        }
      } catch (error) {
        setFavorites((current) =>
          currentlyFavorited
            ? [track, ...current.filter((item) => item.videoId !== track.videoId)]
            : current.filter((item) => item.videoId !== track.videoId),
        );
        toast(errorMessage(error), "error");
      } finally {
        setPendingIds((current) => {
          const next = new Set(current);
          next.delete(track.videoId);
          return next;
        });
      }
    },
    [favoriteIds, toast],
  );

  const value = useMemo<FavoritesContextValue>(
    () => ({
      favorites,
      loading,
      pendingIds,
      isFavorite,
      toggle,
      refresh: load,
    }),
    [favorites, loading, pendingIds, isFavorite, toggle, load],
  );

  return (
    <FavoritesContext.Provider value={value}>
      {children}
    </FavoritesContext.Provider>
  );
}

export function useFavorites(): FavoritesContextValue {
  const context = useContext(FavoritesContext);
  if (!context) {
    throw new Error("useFavorites must be used inside FavoritesProvider.");
  }
  return context;
}
