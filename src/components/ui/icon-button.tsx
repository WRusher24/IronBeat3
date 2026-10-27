import {
  forwardRef,
  type ButtonHTMLAttributes,
  type ReactNode,
} from "react";

import { cn } from "@/lib/cn";

export type IconButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  label: string;
  children: ReactNode;
  tone?: "default" | "accent" | "panel";
};

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  function IconButton(
    { label, children, className, tone = "default", type = "button", ...props },
    ref,
  ) {
    return (
      <button
        ref={ref}
        type={type}
        aria-label={label}
        title={label}
        className={cn(
          "grid size-10 shrink-0 place-items-center rounded-full transition active:scale-95 disabled:pointer-events-none disabled:opacity-40 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-accent/25",
          tone === "default" && "text-muted hover:bg-surface-soft hover:text-ink",
          tone === "accent" && "text-accent hover:bg-accent/10",
          tone === "panel" && "bg-panel text-on-panel hover:opacity-90",
          className,
        )}
        {...props}
      >
        {children}
      </button>
    );
  },
);
