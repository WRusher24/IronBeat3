"use client";

import { ArrowRight, Sparkles } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { useTheme } from "@/components/theme-provider";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";
import { apiFetch, errorMessage } from "@/lib/client-api";
import type { PublicUser } from "@/types";

export default function RegisterPage() {
  const router = useRouter();
  const { setTheme } = useTheme();

  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("Use at least 8 characters for your password.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Those passwords don't match yet.");
      return;
    }

    setSubmitting(true);

    try {
      const data = await apiFetch<{ user: PublicUser }>("/api/auth/register", {
        method: "POST",
        body: JSON.stringify({
          displayName: displayName.trim(),
          email,
          password,
        }),
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
      <p className="eyebrow">Instant access</p>
      <h1 className="mt-2 font-display text-[42px] leading-[0.97] tracking-[-0.02em]">
        Build your
        <br />
        <em className="text-accent-strong">private vault.</em>
      </h1>
      <p className="mt-3 max-w-[340px] text-[13px] leading-relaxed text-muted">
        No approval queue. Create an account and start searching, saving, and
        streaming your training soundtrack right away.
      </p>

      <form
        onSubmit={handleSubmit}
        className="mt-7 space-y-4 rounded-[28px] border border-border bg-surface/75 p-4 shadow-[0_30px_70px_-50px_rgba(0,0,0,0.6)] backdrop-blur-sm"
      >
        <TextField
          label="Name (optional)"
          autoComplete="name"
          placeholder="What should we call you?"
          maxLength={40}
          value={displayName}
          onChange={(event) => setDisplayName(event.target.value)}
        />

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
          autoComplete="new-password"
          placeholder="At least 8 characters"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
          minLength={8}
          maxLength={72}
        />

        <TextField
          label="Confirm password"
          type="password"
          revealable
          autoComplete="new-password"
          placeholder="Type it once more"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          required
          minLength={8}
          maxLength={72}
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
          {submitting ? "Creating your vault…" : "Start lifting"}
        </Button>

        <p className="flex items-center justify-center gap-1.5 text-center text-[10px] uppercase tracking-[0.13em] text-faint">
          <Sparkles className="size-3 text-accent" />
          Private by default · instant playback
        </p>
      </form>

      <p className="mt-5 text-center text-[13px] text-muted">
        Already have a vault?{" "}
        <Link
          href="/login"
          className="font-semibold text-ink underline decoration-accent decoration-2 underline-offset-4"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}
