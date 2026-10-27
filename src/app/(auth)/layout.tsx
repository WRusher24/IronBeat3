import { Logo } from "@/components/ui/logo";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative mx-auto flex min-h-dvh w-full max-w-[540px] flex-col px-5 pb-[max(env(safe-area-inset-bottom),2rem)] pt-[max(env(safe-area-inset-top),1.25rem)]">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[420px] bg-[radial-gradient(80%_70%_at_50%_0%,color-mix(in_srgb,var(--accent)_22%,transparent),transparent_70%)]"
      />

      <header className="flex items-center justify-between">
        <Logo />
        <span className="rounded-full border border-border bg-surface/70 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">
          Gym audio
        </span>
      </header>

      <main className="flex flex-1 flex-col justify-center py-10">{children}</main>

      <footer className="flex items-center justify-between text-[10px] uppercase tracking-[0.18em] text-faint">
        <span>IronBeat</span>
        <span>Cream · Charcoal · Amber</span>
      </footer>
    </div>
  );
}
