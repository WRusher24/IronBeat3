import { redirect } from "next/navigation";

import { AppProviders } from "@/components/app-providers";
import { BottomNav } from "@/components/layout/bottom-nav";
import { MiniPlayer } from "@/components/player/mini-player";
import { NowPlayingSheet } from "@/components/player/now-playing-sheet";
import { getSessionClaims } from "@/lib/auth-server";

export const dynamic = "force-dynamic";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const claims = await getSessionClaims();
  if (!claims) {
    redirect("/login");
  }

  return (
    <AppProviders>
      <div className="relative mx-auto min-h-dvh w-full max-w-[540px] pb-[calc(env(safe-area-inset-bottom)+10.75rem)]">
        {children}
        <MiniPlayer />
        <BottomNav />
        <NowPlayingSheet />
      </div>
    </AppProviders>
  );
}
