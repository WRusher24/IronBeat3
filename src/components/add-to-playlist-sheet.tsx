"use client";

import { Check, Loader2, Plus, Sparkles } from "lucide-react";
import {
  useCallback,
  useEffect,
  useState,
  type FormEvent,
} from "react";

import { apiFetch, errorMessage } from "@/lib/client-api";
import { cn } from "@/lib/cn";
import { PLAYLIST_EMOJIS } from "@/lib/vibes";
import type { PlaylistSummary, Track } from "@/types";

import { Button } from "./ui/button";
import { Sheet } from "./ui/sheet";
import { TextField } from "./ui/text-field";
import { useToast } from "./ui/toast";

type AddToPlaylistSheetProps = {
  track: Track | null;
  open: boolean;
  onClose: () => void;
};

export function AddToPlaylistSheet({
  track,
  open,
  onClose,
}: AddToPlaylistSheetProps) {
  const [playlists, setPlaylists] = useState<PlaylistSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [addingId, setAddingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState(PLAYLIST_EMOJIS[0] ?? "🏋️");
  const { toast } = useToast();

  const loadPlaylists = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch<{ playlists: PlaylistSummary[] }>("/api/playlists");
      setPlaylists(data.playlists);
    } catch (error) {
      toast(errorMessage(error), "error");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (!open) {
      return;
    }
    setShowCreate(false);
    setName("");
    setEmoji(PLAYLIST_EMOJIS[0] ?? "🏋️");
    void loadPlaylists();
  }, [open, loadPlaylists]);

  async function addToPlaylist(playlist: PlaylistSummary) {
    if (!track) {
      return;
    }

    setAddingId(playlist.id);
    try {
      await apiFetch<{ added: boolean }>(
        `/api/playlists/${playlist.id}/tracks`,
        {
          method: "POST",
          body: JSON.stringify({ track }),
        },
      );
      toast(`Added to ${playlist.name}`, "success");
      onClose();
    } catch (error) {
      toast(errorMessage(error), "error");
    } finally {
      setAddingId(null);
    }
  }

  async function createAndAdd(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!track) {
      return;
    }

    const trimmed = name.trim();
    if (!trimmed) {
      toast("Give your playlist a name first.", "error");
      return;
    }

    setCreating(true);
    try {
      const created = await apiFetch<{ playlist: PlaylistSummary }>(
        "/api/playlists",
        {
          method: "POST",
          body: JSON.stringify({
            name: trimmed,
            emoji,
            description: "",
          }),
        },
      );

      await apiFetch(`/api/playlists/${created.playlist.id}/tracks`, {
        method: "POST",
        body: JSON.stringify({ track }),
      });

      toast(`Created ${created.playlist.name} and added the track`, "success");
      onClose();
    } catch (error) {
      toast(errorMessage(error), "error");
    } finally {
      setCreating(false);
    }
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Add to playlist"
      description={track ? track.title : undefined}
    >
      {loading ? (
        <div className="space-y-2">
          {[0, 1, 2].map((index) => (
            <div
              key={index}
              className="flex items-center gap-3 rounded-2xl border border-border bg-surface/60 p-3"
            >
              <span className="size-10 animate-pulse rounded-xl bg-surface-soft" />
              <span className="h-3.5 flex-1 animate-pulse rounded-full bg-surface-soft" />
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {playlists.map((playlist) => (
            <button
              key={playlist.id}
              type="button"
              onClick={() => void addToPlaylist(playlist)}
              disabled={addingId !== null}
              className="flex w-full items-center gap-3 rounded-2xl border border-border bg-surface/70 px-3 py-2.5 text-left transition hover:border-accent/40 hover:bg-surface disabled:opacity-60"
            >
              <span className="grid size-10 place-items-center rounded-xl bg-surface-soft text-lg">
                {playlist.emoji}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold">
                  {playlist.name}
                </span>
                <span className="block text-[11px] text-muted">
                  {playlist.trackCount} {playlist.trackCount === 1 ? "track" : "tracks"}
                </span>
              </span>
              {addingId === playlist.id ? (
                <Loader2 className="size-4 animate-spin text-accent" />
              ) : (
                <Plus className="size-4 text-muted" />
              )}
            </button>
          ))}

          {playlists.length === 0 && !showCreate ? (
            <p className="rounded-2xl border border-dashed border-border-strong px-4 py-5 text-center text-[13px] text-muted">
              No playlists yet. Create your first training folder below.
            </p>
          ) : null}

          {!showCreate ? (
            <button
              type="button"
              onClick={() => setShowCreate(true)}
              className="flex w-full items-center gap-3 rounded-2xl border border-dashed border-border-strong px-3 py-3 text-left transition hover:border-accent/50 hover:bg-surface/60"
            >
              <span className="grid size-10 place-items-center rounded-xl bg-accent/15 text-accent">
                <Sparkles className="size-4" />
              </span>
              <span className="text-sm font-semibold">New playlist</span>
            </button>
          ) : (
            <form
              onSubmit={(event) => void createAndAdd(event)}
              className="space-y-3 rounded-2xl border border-border bg-surface/70 p-3.5"
            >
              <TextField
                label="Playlist name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Push day heat"
                maxLength={60}
                autoFocus
              />
              <div>
                <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">
                  Emoji
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {PLAYLIST_EMOJIS.map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => setEmoji(option)}
                      aria-label={`Use ${option}`}
                      aria-pressed={emoji === option}
                      className={cn(
                        "grid size-9 place-items-center rounded-xl border text-lg transition",
                        emoji === option
                          ? "border-accent bg-accent/15"
                          : "border-transparent bg-surface-soft hover:border-border-strong",
                      )}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  type="submit"
                  size="sm"
                  loading={creating}
                  disabled={!name.trim() || !track}
                  className="flex-1"
                >
                  <Check className="size-4" />
                  Create & add
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => setShowCreate(false)}
                >
                  Cancel
                </Button>
              </div>
            </form>
          )}
        </div>
      )}
    </Sheet>
  );
}
