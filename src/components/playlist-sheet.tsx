"use client";

import { Loader2, Trash2 } from "lucide-react";
import {
  useEffect,
  useState,
  type FormEvent,
} from "react";

import { apiFetch, errorMessage } from "@/lib/client-api";
import { cn } from "@/lib/cn";
import { PLAYLIST_EMOJIS } from "@/lib/vibes";
import type { PlaylistSummary } from "@/types";

import { Button } from "./ui/button";
import { Sheet } from "./ui/sheet";
import { TextField } from "./ui/text-field";
import { useToast } from "./ui/toast";

export type EditablePlaylist = {
  id: string;
  name: string;
  description: string;
  emoji: string;
};

type PlaylistSheetProps = {
  open: boolean;
  onClose: () => void;
  playlist?: EditablePlaylist | null;
  onSaved?: (playlist: PlaylistSummary) => void;
  onDeleted?: (playlistId: string) => void;
};

export function PlaylistSheet({
  open,
  onClose,
  playlist = null,
  onSaved,
  onDeleted,
}: PlaylistSheetProps) {
  const isEdit = Boolean(playlist);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [emoji, setEmoji] = useState(PLAYLIST_EMOJIS[0] ?? "🏋️");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (!open) {
      return;
    }

    setName(playlist?.name ?? "");
    setDescription(playlist?.description ?? "");
    setEmoji(playlist?.emoji ?? PLAYLIST_EMOJIS[0] ?? "🏋️");
    setConfirmDelete(false);
  }, [open, playlist]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmed = name.trim();
    if (!trimmed) {
      toast("Give your playlist a name first.", "error");
      return;
    }

    setSaving(true);
    try {
      if (isEdit && playlist) {
        const data = await apiFetch<{
          playlist: Omit<PlaylistSummary, "trackCount">;
        }>(`/api/playlists/${playlist.id}`, {
          method: "PATCH",
          body: JSON.stringify({
            name: trimmed,
            description: description.trim(),
            emoji,
          }),
        });

        toast("Playlist updated", "success");
        onSaved?.({
          ...data.playlist,
          trackCount: 0,
          createdAt: data.playlist.createdAt,
          updatedAt: data.playlist.updatedAt,
        });
      } else {
        const data = await apiFetch<{ playlist: PlaylistSummary }>(
          "/api/playlists",
          {
            method: "POST",
            body: JSON.stringify({
              name: trimmed,
              description: description.trim(),
              emoji,
            }),
          },
        );

        toast("Playlist created", "success");
        onSaved?.(data.playlist);
      }

      onClose();
    } catch (error) {
      toast(errorMessage(error), "error");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!playlist) {
      return;
    }

    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }

    setDeleting(true);
    try {
      await apiFetch(`/api/playlists/${playlist.id}`, { method: "DELETE" });
      toast("Playlist deleted");
      onDeleted?.(playlist.id);
      onClose();
    } catch (error) {
      toast(errorMessage(error), "error");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={isEdit ? "Edit playlist" : "New playlist"}
      description={
        isEdit
          ? "Rename the folder or give it a fresh emblem."
          : "Build a folder for a specific training block."
      }
    >
      <form onSubmit={(event) => void handleSubmit(event)} className="space-y-4">
        <TextField
          label="Name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Heavy push day"
          maxLength={60}
          autoFocus
        />

        <TextField
          label="Description (optional)"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="Squats, presses, and zero distractions"
          maxLength={160}
        />

        <div>
          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">
            Emblem
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
                  "grid size-10 place-items-center rounded-xl border text-lg transition",
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

        <Button
          type="submit"
          className="w-full"
          loading={saving}
          disabled={!name.trim()}
        >
          {isEdit ? "Save changes" : "Create playlist"}
        </Button>

        {isEdit ? (
          <div className="border-t border-border pt-4">
            {confirmDelete ? (
              <div className="space-y-2">
                <p className="text-[13px] text-muted">
                  Delete this playlist and all of its saved tracks? This cannot
                  be undone.
                </p>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="danger"
                    size="sm"
                    loading={deleting}
                    onClick={() => void handleDelete()}
                    className="flex-1"
                  >
                    <Trash2 className="size-4" />
                    Delete permanently
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setConfirmDelete(false)}
                  >
                    Keep it
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setConfirmDelete(true)}
                className="w-full text-[color:var(--danger)]"
              >
                {deleting ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Trash2 className="size-4" />
                )}
                Delete playlist
              </Button>
            )}
          </div>
        ) : null}
      </form>
    </Sheet>
  );
}
