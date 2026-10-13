"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { navFor, type WorkspaceKind } from "./nav-config";

/**
 * Persistent bottom navigation on mobile. Shows the four "primary"
 * items from the workspace nav (marked with `primary: true` in
 * nav-config) plus a Menu button that opens the full drawer.
 *
 * Desktop hides it entirely via `lg:hidden`.
 */
export function MobileBottomNav({
  kind,
  onOpenMenu,
}: {
  kind: WorkspaceKind;
  onOpenMenu: () => void;
}) {
  const pathname = usePathname();
  const items = navFor(kind);
  const primary = items.filter((i) => i.primary).slice(0, 4);

  function isActive(href: string) {
    // Exact match for the workspace root.
    if (href === "/advertiser" || href === "/creator") {
      return pathname === href;
    }
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  return (
    <nav
      aria-label="Mobile navigation"
      className="fixed inset-x-0 bottom-0 z-[60] flex h-[var(--mobile-nav-height)] items-stretch justify-around border-t border-border bg-surface-1/95 px-1 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden"
    >
      {primary.map((item) => {
        const Icon = item.icon;
        const active = isActive(item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            aria-label={item.label}
            aria-current={active ? "page" : undefined}
            className={cn(
              "relative flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 px-1",
              active ? "text-brand-300" : "text-text-muted",
            )}
          >
            {active && (
              <span className="absolute left-1/2 top-0 h-[3px] w-8 -translate-x-1/2 rounded-b-full bg-brand-400" />
            )}
            <span
              className={cn(
                "flex h-8 w-10 items-center justify-center rounded-xl transition",
                active && "bg-brand-500/15",
              )}
            >
              <Icon size={19} strokeWidth={active ? 2.2 : 1.8} />
            </span>
            <span className="max-w-full truncate text-[10px] leading-none">
              {item.label}
            </span>
          </Link>
        );
      })}

      <button
        type="button"
        onClick={onOpenMenu}
        aria-label="Open menu"
        className="flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 px-1 text-text-muted"
      >
        <span className="flex h-8 w-10 items-center justify-center rounded-xl">
          <Menu size={19} strokeWidth={1.8} />
        </span>
        <span className="text-[10px] leading-none">Menu</span>
      </button>
    </nav>
  );
}
