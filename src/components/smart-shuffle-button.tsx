"use client";

import { Play, Sparkles } from "lucide-react";
import { useState } from "react";

import { usePlayerActions } from "@/components/player/player-provider";
import { useToast } from "@/components/ui/toast";
import { apiFetch, errorMessage } from "@/lib/client-api";
import type { SmartShuffleResponse } from "@/types";

export function SmartShuffleButton() {
  const { playQueue } = usePlayerActions();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  async function launch() {
    setLoading(true);
    try {
      const data = await apiFetch<SmartShuffleResponse>("/api/smart-shuffle", {
        method: "POST",
      });

      if (data.tracks.length === 0) {
        toast("Smart Shuffle needs a little more listening history.", "error");
        return;
      }

      playQueue(data.tracks, 0);
      toast(`Smart mix · ${data.tracks.length} tracks`, "success");
    } catch (error) {
      toast(errorMessage(error), "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={() => void launch()}
      disabled={loading}
      className="group relative flex w-full items-center gap-3 overflow-hidden rounded-3xl border border-white/10 bg-panel p-4 text-left text-on-panel transition active:scale-[0.995] disabled:opacity-70"
    >
      <span className="absolute -right-8 -top-12 size-32 rounded-full bg-accent/25 blur-2xl transition group-hover:bg-accent/35" />
      <span className="relative grid size-11 shrink-0 place-items-center rounded-2xl bg-accent/15 text-accent">
        <Sparkles className="size-5" />
      </span>
      <span className="relative min-w-0 flex-1">
        <span className="block text-[14px] font-semibold tracking-[-0.01em]">
          Smart Shuffle
        </span>
        <span className="mt-0.5 block text-[11.5px] leading-relaxed opacity-60">
          A fresh mix from your searches, plays, and favorites.
        </span>
      </span>
      <span className="relative grid size-9 shrink-0 place-items-center rounded-full bg-accent text-accent-ink">
        <Play className="ml-0.5 size-4 fill-current" />
      </span>
    </button>
  );
}
