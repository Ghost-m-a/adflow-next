"use client";

import {
  Check,
  ChevronDown,
  LayoutGrid,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils/cn";
import {
  WORKSPACE_ICONS,
  WORKSPACE_LABELS,
  type WorkspaceKind,
} from "./nav-config";

const ORDER: WorkspaceKind[] = ["advertiser", "creator"];

export function WorkspaceSwitcher({
  current,
  collapsed = false,
}: {
  current: WorkspaceKind;
  collapsed?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const CurrentIcon = WORKSPACE_ICONS[current];
  const pathname = usePathname();

  useEffect(() => {
    if (!open) return;
    function onDown(e: PointerEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        className={cn(
          "flex w-full items-center gap-3 rounded-xl border border-transparent p-2 text-left transition",
          "hover:border-border hover:bg-white/[0.04]",
          collapsed && "justify-center px-0",
        )}
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-brand-500/20 bg-brand-500/15 text-brand-300">
          <CurrentIcon size={18} />
        </span>
        {!collapsed && (
          <>
            <span className="min-w-0 flex-1">
              <span className="block text-[10px] font-semibold uppercase tracking-[0.14em] text-text-subtle">
                Workspace
              </span>
              <span className="mt-0.5 block truncate text-sm font-medium">
                {WORKSPACE_LABELS[current]}
              </span>
            </span>
            <ChevronDown size={15} className={cn("shrink-0 text-text-subtle transition-transform", open && "rotate-180")} />
          </>
        )}
      </button>

      {open && (
        <div
          role="menu"
          className={cn(
            "absolute z-50 w-64 rounded-2xl border border-border bg-surface-2 p-2 shadow-xl",
            collapsed ? "left-[calc(100%+8px)] top-0" : "left-0 top-[calc(100%+8px)]",
          )}
        >
          <p className="flex items-center gap-2 px-2 pb-2 pt-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-text-subtle">
            <LayoutGrid size={11} />
            Switch workspace
          </p>

          {ORDER.map((kind) => {
            const Icon = WORKSPACE_ICONS[kind];
            const active = kind === current;
            const href = kind === "advertiser" ? "/advertiser" : "/creator";
            void pathname;

            return (
              <Link
                key={kind}
                href={href}
                onClick={() => setOpen(false)}
                role="menuitem"
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition",
                  active
                    ? "bg-brand-500/15 text-brand-200"
                    : "text-text hover:bg-white/[0.06]",
                )}
              >
                <Icon size={17} className="shrink-0 text-text-muted" />
                <span className="flex-1 text-left">{WORKSPACE_LABELS[kind]}</span>
                {active && <Check size={15} className="shrink-0 text-brand-300" />}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
