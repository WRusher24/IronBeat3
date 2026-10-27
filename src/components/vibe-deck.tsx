"use client";

import { Play } from "lucide-react";

import type { Vibe } from "@/lib/vibes";
import { VIBES } from "@/lib/vibes";

export function VibeDeck({ onSelect }: { onSelect: (vibe: Vibe) => void }) {
  return (
    <div className="grid grid-cols-2 gap-2.5">
      {VIBES.map((vibe) => (
        <button
          key={vibe.id}
          type="button"
          onClick={() => onSelect(vibe)}
          aria-label={`${vibe.label} — ${vibe.subtitle}`}
          style={{ backgroundImage: vibe.gradient }}
          className="group relative flex min-h-[128px] flex-col justify-between overflow-hidden rounded-[22px] border border-white/10 p-3.5 text-left text-[#f7f3ec] shadow-[0_16px_38px_-26px_rgba(0,0,0,0.75)] transition duration-200 active:scale-[0.985] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-accent/30"
        >
          <span
            aria-hidden="true"
            className="absolute -right-10 -top-12 size-28 rounded-full opacity-30 blur-2xl transition duration-300 group-hover:opacity-50"
            style={{ backgroundColor: vibe.accent }}
          />
          <span
            aria-hidden="true"
            className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/40 to-transparent"
          />

          <span className="relative flex items-start justify-between">
            <span className="grid size-9 place-items-center rounded-xl border border-white/10 bg-white/10 text-[17px] backdrop-blur-sm">
              {vibe.emoji}
            </span>
            <span className="grid size-7 place-items-center rounded-full border border-white/15 bg-white/5 opacity-70 transition group-hover:opacity-100">
              <Play className="ml-0.5 size-3 fill-current" />
            </span>
          </span>

          <span className="relative mt-6 block">
            <span className="block text-[13.5px] font-semibold leading-tight tracking-[-0.01em]">
              {vibe.label}
            </span>
            <span className="mt-1 block text-[10px] leading-snug text-white/55">
              {vibe.subtitle}
            </span>
          </span>
        </button>
      ))}
    </div>
  );
}
