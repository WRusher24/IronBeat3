"use client";

import Link from "next/link";
import { useEffect } from "react";

import { Button } from "@/components/ui/button";
import { Logo } from "@/components/ui/logo";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[ironbeat:ui]", error);
  }, [error]);

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-[540px] flex-col px-5 pb-10 pt-[max(env(safe-area-inset-top),1.25rem)]">
      <Logo />

      <div className="flex flex-1 flex-col justify-center py-12">
        <p className="eyebrow">Unexpected drop</p>
        <h1 className="mt-2 font-display text-[46px] leading-[0.96] tracking-[-0.02em]">
          The set got
          <br />
          <em className="text-accent-strong">interrupted.</em>
        </h1>
        <p className="mt-4 max-w-[320px] text-[13px] leading-relaxed text-muted">
          Something went wrong while rendering this screen. Your music and
          saved vault are untouched.
        </p>
        <div className="mt-7 flex items-center gap-2">
          <Button onClick={reset} size="md">
            Try again
          </Button>
          <Link
            href="/"
            className="inline-flex h-11 items-center rounded-full border border-border-strong px-5 text-[13px] font-semibold text-ink transition hover:bg-surface-soft"
          >
            Back home
          </Link>
        </div>
        {error.digest ? (
          <p className="mt-5 text-[10px] uppercase tracking-[0.14em] text-faint">
            Reference: {error.digest}
          </p>
        ) : null}
      </div>
    </div>
  );
}
