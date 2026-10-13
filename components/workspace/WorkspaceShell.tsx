"use client";

import { Menu } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { WorkspaceSidebar } from "./WorkspaceSidebar";
import type { WorkspaceKind } from "./nav-config";

const STORAGE_KEY = "adflow:sidebar:collapsed";
const MANUAL_KEY = "adflow:sidebar:manual";
const AUTO_COLLAPSE_BELOW = 1280;

export function WorkspaceShell({
  kind,
  children,
}: {
  kind: WorkspaceKind;
  children: ReactNode;
}) {
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const hoverTimeout = useRef<number | null>(null);

  useEffect(() => {
    try {
      const manual = localStorage.getItem(MANUAL_KEY) === "true";
      const saved = localStorage.getItem(STORAGE_KEY) === "true";
      setCollapsed(
        manual ? saved : window.innerWidth < AUTO_COLLAPSE_BELOW,
      );
    } catch {}
  }, []);

  useEffect(() => {
    if (!mobileOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setMobileOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mobileOpen]);

  useEffect(() => () => {
    if (hoverTimeout.current) window.clearTimeout(hoverTimeout.current);
  }, []);

  function toggle() {
    setCollapsed((c) => {
      const next = !c;
      try {
        localStorage.setItem(STORAGE_KEY, String(next));
        localStorage.setItem(MANUAL_KEY, "true");
      } catch {}
      return next;
    });
  }

  function onHoverStart() {
    if (!collapsed) return;
    if (hoverTimeout.current) window.clearTimeout(hoverTimeout.current);
    setHovered(true);
  }

  function onHoverEnd() {
    if (hoverTimeout.current) window.clearTimeout(hoverTimeout.current);
    hoverTimeout.current = window.setTimeout(() => setHovered(false), 80);
  }

  const contentMargin = collapsed ? "var(--sidebar-w-sm)" : "var(--sidebar-w)";

  return (
    <div className="min-h-screen bg-canvas text-text">
      {/* Topbar */}
      <header className="fixed inset-x-0 top-0 z-50 h-[var(--header-h)] border-b border-border bg-canvas/95 backdrop-blur-xl">
        <div className="flex h-full items-center gap-3 px-3 sm:px-4">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            aria-label="Open menu"
            className="rounded-xl border border-border bg-surface-2 p-2 text-text-muted transition hover:bg-white/[0.06] hover:text-text lg:hidden"
          >
            <Menu size={18} />
          </button>

          <button
            type="button"
            onClick={() => router.push("/")}
            className="text-xl font-black tracking-tight"
            aria-label="ADFLOW home"
          >
            AD<span className="text-brand-400">FLOW</span>
          </button>

          <div className="ml-auto flex items-center gap-2">
            {/* Notification + user menu slots — plug your existing components here */}
            <div id="adflow-topbar-slot" />
          </div>
        </div>
      </header>

      <WorkspaceSidebar
        kind={kind}
        collapsed={collapsed}
        hovered={hovered}
        mobileOpen={mobileOpen}
        onToggle={toggle}
        onCloseMobile={() => setMobileOpen(false)}
        onHoverStart={onHoverStart}
        onHoverEnd={onHoverEnd}
      />

      {/* Main content — margin follows PERSISTENT state only */}
      <div
        className="pt-[var(--header-h)] transition-[margin] duration-200 ease-out lg:ml-[var(--adflow-content-margin)]"
        style={{ "--adflow-content-margin": contentMargin } as React.CSSProperties}
      >
        <main className="mx-auto w-full max-w-[1600px] px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
          {children}
        </main>
      </div>
    </div>
  );
}
