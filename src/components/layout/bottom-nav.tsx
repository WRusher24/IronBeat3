"use client";

import { House, ListMusic, Search, SlidersHorizontal } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/cn";

const ITEMS = [
  { href: "/", label: "Home", icon: House },
  { href: "/search", label: "Search", icon: Search },
  { href: "/playlists", label: "Library", icon: ListMusic },
  { href: "/settings", label: "Settings", icon: SlidersHorizontal },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-40 px-3 pb-[max(env(safe-area-inset-bottom),0.55rem)] pt-1.5"
    >
      <div className="mx-auto flex max-w-[516px] items-center gap-1 rounded-[22px] border border-border bg-bg/90 p-1.5 shadow-[0_-16px_50px_-30px_rgba(0,0,0,0.65)] backdrop-blur-xl">
        {ITEMS.map((item) => {
          const active =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-2xl px-1.5 py-2 text-[9.5px] font-semibold uppercase tracking-[0.12em] transition",
                active
                  ? "bg-surface text-ink shadow-[0_6px_20px_-16px_rgba(0,0,0,0.6)]"
                  : "text-muted hover:bg-surface/50 hover:text-ink",
              )}
            >
              <Icon
                className={cn("size-[18px]", active && "text-accent")}
                strokeWidth={active ? 2.2 : 1.8}
              />
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
