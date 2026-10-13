"use client";

import { ChevronLeft, CircleHelp, Plus, Settings, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils/cn";
import { WorkspaceSwitcher } from "./WorkspaceSwitcher";
import { navFor, type WorkspaceKind } from "./nav-config";

export function WorkspaceSidebar({
  kind,
  collapsed,
  hovered,
  mobileOpen,
  onToggle,
  onCloseMobile,
  onHoverStart,
  onHoverEnd,
}: {
  kind: WorkspaceKind;
  collapsed: boolean;
  hovered: boolean;
  mobileOpen: boolean;
  onToggle: () => void;
  onCloseMobile: () => void;
  onHoverStart: () => void;
  onHoverEnd: () => void;
}) {
  const pathname = usePathname();
  const items = navFor(kind);
  const visuallyExpanded = !collapsed || hovered;

  function isActive(href: string) {
    if (href === "/advertiser" || href === "/creator") return pathname === href;
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  return (
    <>
      {/* Mobile backdrop */}
      {mobileOpen && (
        <button
          type="button"
          aria-label="Close navigation"
          onClick={onCloseMobile}
          className="fixed inset-0 top-[var(--header-h)] z-40 bg-black/60 backdrop-blur-sm lg:hidden"
        />
      )}

      {/* Desktop */}
      <aside
        onMouseEnter={onHoverStart}
        onMouseLeave={onHoverEnd}
        style={{ width: visuallyExpanded ? "var(--sidebar-w)" : "var(--sidebar-w-sm)" }}
        className={cn(
          "fixed bottom-0 left-0 top-[var(--header-h)] z-30 hidden flex-col border-r border-border bg-surface-1 transition-[width] lg:flex",
          hovered && collapsed && "z-40 shadow-2xl",
        )}
      >
        <div className="shrink-0 border-b border-border p-2">
          <WorkspaceSwitcher current={kind} collapsed={!visuallyExpanded} />
        </div>

        <nav className="flex-1 space-y-0.5 overflow-y-auto px-2 py-3">
          {items.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                title={!visuallyExpanded ? item.label : undefined}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex h-10 items-center rounded-xl text-sm transition-colors",
                  visuallyExpanded ? "gap-3 px-3" : "justify-center px-0",
                  active
                    ? "bg-brand-500/15 font-medium text-brand-200"
                    : "text-text-muted hover:bg-white/[0.045] hover:text-text",
                )}
              >
                {active && (
                  <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-brand-400" />
                )}
                <Icon size={18} strokeWidth={active ? 2.2 : 1.8} className="shrink-0" />
                {visuallyExpanded && <span className="truncate">{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        <div className="shrink-0 space-y-0.5 border-t border-border p-2">
          <Link
            href="/organizations"
            title={!visuallyExpanded ? "Organizations" : undefined}
            className={cn(
              "flex h-10 items-center rounded-xl text-sm text-text-muted transition hover:bg-white/[0.045] hover:text-text",
              visuallyExpanded ? "gap-3 px-3" : "justify-center px-0",
            )}
          >
            <Plus size={18} className="shrink-0" />
            {visuallyExpanded && <span className="truncate">Organizations</span>}
          </Link>

          <Link
            href="/settings"
            title={!visuallyExpanded ? "Settings" : undefined}
            className={cn(
              "flex h-10 items-center rounded-xl text-sm text-text-muted transition hover:bg-white/[0.045] hover:text-text",
              visuallyExpanded ? "gap-3 px-3" : "justify-center px-0",
            )}
          >
            <Settings size={18} className="shrink-0" />
            {visuallyExpanded && <span className="truncate">Settings</span>}
          </Link>

          <Link
            href="/help"
            title={!visuallyExpanded ? "Help" : undefined}
            className={cn(
              "flex h-10 items-center rounded-xl text-sm text-text-muted transition hover:bg-white/[0.045] hover:text-text",
              visuallyExpanded ? "gap-3 px-3" : "justify-center px-0",
            )}
          >
            <CircleHelp size={18} className="shrink-0" />
            {visuallyExpanded && <span className="truncate">Help & support</span>}
          </Link>

          <button
            type="button"
            onClick={onToggle}
            title={collapsed ? "Pin expanded" : "Collapse"}
            className={cn(
              "mt-1 flex h-9 w-full items-center rounded-xl border border-border text-xs font-medium text-text-muted transition hover:bg-white/[0.04] hover:text-text",
              visuallyExpanded ? "gap-2 px-3" : "justify-center px-0",
            )}
          >
            <ChevronLeft size={16} className={cn("shrink-0 transition-transform", collapsed && "rotate-180")} />
            {visuallyExpanded && <span>Collapse</span>}
          </button>
        </div>
      </aside>

      {/* Mobile drawer */}
      <aside
        className={cn(
          "fixed bottom-0 left-0 top-[var(--header-h)] z-50 flex w-[min(300px,85vw)] flex-col overflow-hidden",
          "border-r border-border bg-surface-1 shadow-2xl transition-transform duration-200 ease-out lg:hidden",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-border p-4">
          <span className="text-sm font-semibold">Menu</span>
          <button
            type="button"
            onClick={onCloseMobile}
            aria-label="Close menu"
            className="rounded-lg p-2 text-text-muted hover:bg-white/[0.06] hover:text-text"
          >
            <X size={18} />
          </button>
        </div>

        <div className="border-b border-border p-2">
          <WorkspaceSwitcher current={kind} />
        </div>

        <nav className="flex-1 space-y-0.5 overflow-y-auto p-2">
          {items.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onCloseMobile}
                className={cn(
                  "flex h-11 items-center gap-3 rounded-xl px-3 text-sm",
                  active
                    ? "bg-brand-500/15 font-medium text-brand-200"
                    : "text-text-muted hover:bg-white/[0.045] hover:text-text",
                )}
              >
                <Icon size={18} />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>
    </>
  );
}
