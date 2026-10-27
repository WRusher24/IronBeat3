"use client";

import { ArrowRight, LockKeyhole } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { useTheme } from "@/components/theme-provider";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";
import { apiFetch, errorMessage } from "@/lib/client-api";
import type { PublicUser } from "@/types";

export default function LoginPage() {
  const router = useRouter();
  const { setTheme } = useTheme();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const data = await apiFetch<{ user: PublicUser }>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });

      setTheme(data.user.theme, { persist: false });
      router.replace("/");
      router.refresh();
    } catch (requestError) {
      setError(errorMessage(requestError));
      setSubmitting(false);
    }
  }

  return (
    <div className="animate-rise">
      <p className="eyebrow">Welcome back</p>
      <h1 className="mt-2 font-display text-[42px] leading-[0.97] tracking-[-0.02em]">
        Pick up
        <br />
        <em className="text-accent-strong">the beat.</em>
      </h1>
      <p className="mt-3 max-w-[330px] text-[13px] leading-relaxed text-muted">
        Your private vault of training playlists and instant audio is one tap
        away.
      </p>

      <form
        onSubmit={handleSubmit}
        className="mt-8 space-y-4 rounded-[28px] border border-border bg-surface/75 p-4 shadow-[0_30px_70px_-50px_rgba(0,0,0,0.6)] backdrop-blur-sm"
      >
        <TextField
          label="Email"
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder="you@example.com"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />

        <TextField
          label="Password"
          type="password"
          revealable
          autoComplete="current-password"
          placeholder="Your password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
        />

        {error ? (
          <p
            role="alert"
            className="rounded-xl border border-[color:var(--danger)]/25 bg-[color:var(--danger)]/10 px-3 py-2 text-[12px] font-medium text-[color:var(--danger)]"
          >
            {error}
          </p>
        ) : null}

        <Button
          type="submit"
          size="lg"
          className="w-full"
          loading={submitting}
          icon={submitting ? undefined : <ArrowRight className="size-4" />}
        >
          {submitting ? "Signing in…" : "Sign in"}
        </Button>

        <p className="flex items-center justify-center gap-1.5 text-center text-[10px] uppercase tracking-[0.13em] text-faint">
          <LockKeyhole className="size-3" />
          Hashed passwords · private vault
        </p>
      </form>

      <p className="mt-5 text-center text-[13px] text-muted">
        New to IronBeat?{" "}
        <Link
          href="/register"
          className="font-semibold text-ink underline decoration-accent decoration-2 underline-offset-4"
        >
          Create your vault
        </Link>
      </p>

      <div className="mt-8 flex items-center justify-center gap-2 text-[9.5px] uppercase tracking-[0.18em] text-faint">
        <span className="h-px w-8 bg-border-strong" />
        Instant access, no approval
        <span className="h-px w-8 bg-border-strong" />
      </div>

      <p className="mt-4 text-center text-[10px] leading-relaxed text-faint">
        Built for quick sets. Keep the screen off and the music on.
      </p>
    </div>
  );
}
