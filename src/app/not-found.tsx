import Link from "next/link";

import { Logo } from "@/components/ui/logo";

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-[540px] flex-col px-5 pb-10 pt-[max(env(safe-area-inset-top),1.25rem)]">
      <Logo />

      <div className="flex flex-1 flex-col justify-center py-12">
        <p className="eyebrow">404 · Lost in the rack</p>
        <h1 className="mt-2 font-display text-[46px] leading-[0.96] tracking-[-0.02em]">
          This page
          <br />
          <em className="text-accent-strong">skipped a rep.</em>
        </h1>
        <p className="mt-4 max-w-[310px] text-[13px] leading-relaxed text-muted">
          The page you're looking for isn't here. Head back to the floor and
          pick a vibe.
        </p>
        <Link
          href="/"
          className="mt-7 inline-flex h-11 w-fit items-center rounded-full bg-panel px-5 text-[13px] font-semibold text-on-panel transition hover:opacity-90"
        >
          Back to IronBeat
        </Link>
      </div>

      <p className="text-[10px] uppercase tracking-[0.18em] text-faint">
        IronBeat
      </p>
    </div>
  );
}
