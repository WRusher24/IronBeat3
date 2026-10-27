"use client";

import {
  Check,
  ChevronRight,
  Code2,
  History,
  Loader2,
  LogOut,
  ShieldCheck,
  Smartphone,
  Sparkles,
  UserRound,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { usePlayerActions } from "@/components/player/player-provider";
import { useTheme } from "@/components/theme-provider";
import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";
import { useToast } from "@/components/ui/toast";
import { apiFetch, ApiError, errorMessage } from "@/lib/client-api";
import { cn } from "@/lib/cn";
import { initialsFor } from "@/lib/format";
import { prefersSameOriginAudioRelay } from "@/lib/platform";
import { THEMES } from "@/lib/theme";
import type { PublicUser } from "@/types";

export default function SettingsPage() {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const { clear } = usePlayerActions();
  const { toast } = useToast();

  const [user, setUser] = useState<PublicUser | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [signingOut, setSigningOut] = useState(false);
  const [clearSheetOpen, setClearSheetOpen] = useState(false);
  const [clearingHistory, setClearingHistory] = useState(false);
  const [relayEnabled, setRelayEnabled] = useState(false);

  useEffect(() => {
    setRelayEnabled(prefersSameOriginAudioRelay());
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    let alive = true;

    void apiFetch<{ user: PublicUser }>("/api/auth/me", {
      signal: controller.signal,
    })
      .then((data) => {
        if (alive) {
          setUser(data.user);
        }
      })
      .catch((error: unknown) => {
        if (error instanceof ApiError && error.status === 401) {
          router.replace("/login");
        }
      })
      .finally(() => {
        if (alive) {
          setLoadingUser(false);
        }
      });

    return () => {
      alive = false;
      controller.abort();
    };
  }, [router]);

  async function handleSignOut() {
    setSigningOut(true);
    try {
      await apiFetch("/api/auth/logout", { method: "POST" });
      clear();
      router.replace("/login");
      router.refresh();
    } catch (error) {
      toast(errorMessage(error), "error");
      setSigningOut(false);
    }
  }

  async function handleClearHistory() {
    setClearingHistory(true);
    try {
      await apiFetch("/api/history", { method: "DELETE" });
      toast("Search history cleared", "success");
      setClearSheetOpen(false);
    } catch (error) {
      toast(errorMessage(error), "error");
    } finally {
      setClearingHistory(false);
    }
  }

  const initials = user ? initialsFor(user.displayName, user.email) : "IB";
  const joined = user
    ? new Date(user.createdAt).toLocaleDateString("en-US", {
        month: "short",
        year: "numeric",
      })
    : null;

  return (
    <div className="px-5 pt-[max(env(safe-area-inset-top),1.1rem)]">
      <header>
        <p className="eyebrow">Settings</p>
        <h1 className="mt-1 font-display text-[36px] leading-none tracking-[-0.02em]">
          Tune the room.
        </h1>
      </header>

      <section className="mt-6">
        <div className="flex items-center gap-3.5 rounded-3xl border border-border bg-surface/70 p-4">
          <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-panel text-[16px] font-bold tracking-wide text-on-panel">
            {initials}
          </span>
          <div className="min-w-0 flex-1">
            {loadingUser ? (
              <>
                <span className="block h-4 w-32 animate-pulse rounded-full bg-surface-soft" />
                <span className="mt-2 block h-3 w-44 animate-pulse rounded-full bg-surface-soft" />
              </>
            ) : (
              <>
                <p className="truncate text-[15px] font-semibold tracking-[-0.01em]">
                  {user?.displayName || "Athlete"}
                </p>
                <p className="mt-0.5 truncate text-[12px] text-muted">
                  {user?.email}
                </p>
                {joined ? (
                  <p className="mt-1 text-[10px] uppercase tracking-[0.14em] text-faint">
                    In the gym since {joined}
                  </p>
                ) : null}
              </>
            )}
          </div>
          <span className="grid size-9 place-items-center rounded-full bg-accent/10 text-accent">
            <UserRound className="size-4" />
          </span>
        </div>
      </section>

      <section className="mt-8">
        <div className="flex items-center justify-between">
          <h2 className="text-[15px] font-semibold tracking-[-0.01em]">
            Appearance
          </h2>
          <span className="text-[10px] uppercase tracking-[0.14em] text-faint">
            Instant switch
          </span>
        </div>
        <p className="mt-1 text-[12px] leading-relaxed text-muted">
          The palette applies across every screen and is remembered on this
          device and your account.
        </p>

        <div className="mt-3 grid gap-2">
          {THEMES.map((definition) => {
            const active = theme === definition.id;
            return (
              <button
                key={definition.id}
                type="button"
                onClick={() => setTheme(definition.id)}
                aria-pressed={active}
                className={cn(
                  "flex items-center gap-3 rounded-2xl border px-3.5 py-3 text-left transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-accent/25",
                  active
                    ? "border-accent bg-accent/10"
                    : "border-border bg-surface/60 hover:bg-surface",
                )}
              >
                <span className="flex shrink-0 -space-x-1.5" aria-hidden="true">
                  {definition.swatches.map((color) => (
                    <span
                      key={color}
                      style={{ backgroundColor: color }}
                      className="size-6 rounded-full border-2 border-surface shadow-sm"
                    />
                  ))}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[13.5px] font-semibold">
                    {definition.name}
                  </span>
                  <span className="mt-0.5 block text-[11px] text-muted">
                    {definition.tagline}
                  </span>
                </span>
                {active ? (
                  <span className="grid size-6 shrink-0 place-items-center rounded-full bg-accent text-accent-ink">
                    <Check className="size-3.5" />
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      </section>

      <section className="mt-8">
        <div className="flex items-center gap-2">
          <Smartphone className="size-4 text-accent" />
          <h2 className="text-[15px] font-semibold tracking-[-0.01em]">
            iPhone home screen
          </h2>
        </div>

        <div className="mt-3 overflow-hidden rounded-3xl border border-white/10 bg-panel p-5 text-on-panel">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-accent">
            Fullscreen · custom icon
          </p>
          <h3 className="mt-2 font-display text-[25px] leading-tight">
            Keep it one thumb away.
          </h3>
          <ol className="mt-3.5 space-y-2.5 text-[12px] leading-relaxed opacity-70">
            <li className="flex gap-2.5">
              <span className="grid size-5 shrink-0 place-items-center rounded-full bg-white/10 text-[10px] font-bold">
                1
              </span>
              Open IronBeat in Safari on your iPhone.
            </li>
            <li className="flex gap-2.5">
              <span className="grid size-5 shrink-0 place-items-center rounded-full bg-white/10 text-[10px] font-bold">
                2
              </span>
              Tap the Share button, then “Add to Home Screen”.
            </li>
            <li className="flex gap-2.5">
              <span className="grid size-5 shrink-0 place-items-center rounded-full bg-white/10 text-[10px] font-bold">
                3
              </span>
              Launch it from the custom IronBeat icon for a native, fullscreen
              experience.
            </li>
          </ol>
          <p className="mt-3.5 text-[10.5px] leading-relaxed opacity-40">
            The manifest, Apple touch icon, and standalone metadata are already
            configured — no extra setup needed.
          </p>
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-[15px] font-semibold tracking-[-0.01em]">Data</h2>
        <div className="mt-3 divide-y divide-border overflow-hidden rounded-3xl border border-border bg-surface/60">
          <button
            type="button"
            onClick={() => setClearSheetOpen(true)}
            className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition hover:bg-surface focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-accent/20"
          >
            <span className="grid size-8 place-items-center rounded-xl bg-surface-soft text-muted">
              <History className="size-4" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[13.5px] font-semibold">
                Clear search history
              </span>
              <span className="block text-[11px] text-muted">
                Removes your quick-launch chips on this account
              </span>
            </span>
            <ChevronRight className="size-4 shrink-0 text-faint" />
          </button>

          <button
            type="button"
            onClick={() => void handleSignOut()}
            disabled={signingOut}
            className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition hover:bg-surface disabled:opacity-60 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-accent/20"
          >
            <span className="grid size-8 place-items-center rounded-xl bg-surface-soft text-[color:var(--danger)]">
              <LogOut className="size-4" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[13.5px] font-semibold">
                Sign out
              </span>
              <span className="block text-[11px] text-muted">
                End this session and stop the current track
              </span>
            </span>
            {signingOut ? (
              <Loader2 className="size-4 shrink-0 animate-spin text-muted" />
            ) : (
              <ChevronRight className="size-4 shrink-0 text-faint" />
            )}
          </button>
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-[15px] font-semibold tracking-[-0.01em]">About</h2>
        <div className="mt-3 space-y-3 rounded-3xl border border-border bg-surface/60 p-4">
          <div className="flex items-start gap-3">
            <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-surface-soft text-accent">
              <ShieldCheck className="size-4" />
            </span>
            <div>
              <p className="text-[12.5px] font-semibold">
                Private, isolated vaults
              </p>
              <p className="mt-0.5 text-[11px] leading-relaxed text-muted">
                Playlists, favorites, search chips, and play history are scoped
                to your account. Nobody else can see them.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-surface-soft text-accent">
              <Sparkles className="size-4" />
            </span>
            <div>
              <p className="text-[12.5px] font-semibold">
                Piped-powered audio
              </p>
              <p className="mt-0.5 text-[11px] leading-relaxed text-muted">
                Streams are resolved through community Piped and Invidious
                instances. Availability can vary by track. IronBeat never uses
                the official YouTube API.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-border pt-3">
            <span className="text-[10px] uppercase tracking-[0.14em] text-faint">
              IronBeat v1.1.2 · {relayEnabled ? "iOS relay" : "direct stream"}
            </span>
            <a
              href="https://github.com/WRusher24/IronBeat3"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-muted transition hover:text-ink"
            >
              <Code2 className="size-3.5" />
              Source
            </a>
          </div>
        </div>
      </section>

      <p className="mt-8 text-center text-[10px] uppercase tracking-[0.18em] text-faint">
        Built for the gym floor
      </p>

      <Sheet
        open={clearSheetOpen}
        onClose={() => setClearSheetOpen(false)}
        title="Clear search history?"
        description="Your quick-launch chips will reset to the starter suggestions. Playlists and favorites stay untouched."
      >
        <div className="flex gap-2">
          <Button
            variant="danger"
            className="flex-1"
            loading={clearingHistory}
            onClick={() => void handleClearHistory()}
          >
            Clear history
          </Button>
          <Button
            variant="ghost"
            onClick={() => setClearSheetOpen(false)}
            disabled={clearingHistory}
          >
            Keep it
          </Button>
        </div>
      </Sheet>
    </div>
  );
}
