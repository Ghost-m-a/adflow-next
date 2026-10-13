import { cn } from "@/lib/utils/cn";
import type { HTMLAttributes } from "react";

type Variant = "default" | "success" | "warning" | "danger" | "info" | "brand";

const styles: Record<Variant, string> = {
  default: "bg-white/5 text-text-muted border-border",
  brand:   "bg-brand-500/10 text-brand-300 border-brand-500/20",
  success: "bg-emerald-500/10 text-emerald-300 border-emerald-500/20",
  warning: "bg-amber-500/10 text-amber-300 border-amber-500/20",
  danger:  "bg-red-500/10 text-red-300 border-red-500/20",
  info:    "bg-sky-500/10 text-sky-300 border-sky-500/20",
};

export function Badge({
  variant = "default",
  className,
  ...props
}: HTMLAttributes<HTMLSpanElement> & { variant?: Variant }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize",
        styles[variant],
        className,
      )}
      {...props}
    />
  );
}
