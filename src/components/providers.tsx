import { ServiceWorkerRegistrar } from "@/components/service-worker-registrar";
import { PlayerProvider } from "@/components/player/player-provider";
import { ThemeProvider } from "@/components/theme-provider";
import { ToastProvider } from "@/components/ui/toast";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <ToastProvider>
        <PlayerProvider>
          {children}
          <ServiceWorkerRegistrar />
        </PlayerProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}
