"use client";

import { AlertTriangle, Check, Info, X } from "lucide-react";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { cn } from "@/lib/cn";

type ToastTone = "default" | "success" | "error";

type ToastItem = {
  id: number;
  message: string;
  tone: ToastTone;
};

type ToastContextValue = {
  toast: (message: string, tone?: ToastTone) => void;
  dismiss: (id: number) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

const TONE_STYLES: Record<ToastTone, string> = {
  default: "border-border bg-panel text-on-panel",
  success: "border-transparent bg-[#2f4a33] text-[#f2f8ef]",
  error: "border-transparent bg-[#5a231c] text-[#fff1ed]",
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const counter = useRef(0);
  const timers = useRef(new Map<number, number>());

  const dismiss = useCallback((id: number) => {
    setItems((current) => current.filter((item) => item.id !== id));
    const timer = timers.current.get(id);
    if (timer) {
      window.clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  const toast = useCallback(
    (message: string, tone: ToastTone = "default") => {
      counter.current += 1;
      const id = counter.current;
      setItems((current) => [...current.slice(-2), { id, message, tone }]);

      const timer = window.setTimeout(() => {
        setItems((current) => current.filter((item) => item.id !== id));
        timers.current.delete(id);
      }, 3600);

      timers.current.set(id, timer);
    },
    [],
  );

  const value = useMemo(() => ({ toast, dismiss }), [toast, dismiss]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        className="pointer-events-none fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+10.5rem)] z-[80] flex flex-col items-center gap-2 px-4"
        role="status"
        aria-live="polite"
      >
        {items.map((item) => {
          const Icon =
            item.tone === "error"
              ? AlertTriangle
              : item.tone === "success"
                ? Check
                : Info;

          return (
            <div
              key={item.id}
              className={cn(
                "pointer-events-auto flex w-full max-w-[420px] items-center gap-2.5 rounded-2xl border px-3.5 py-2.5 text-[13px] font-medium shadow-2xl animate-rise",
                TONE_STYLES[item.tone],
              )}
            >
              <Icon className="size-4 shrink-0" />
              <span className="min-w-0 flex-1">{item.message}</span>
              <button
                type="button"
                onClick={() => dismiss(item.id)}
                aria-label="Dismiss notification"
                className="grid size-6 shrink-0 place-items-center rounded-full opacity-70 transition hover:opacity-100"
              >
                <X className="size-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used inside ToastProvider.");
  }
  return context;
}
