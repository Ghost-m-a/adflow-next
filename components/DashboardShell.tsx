"use client";

import { Menu, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import type { ReactNode } from "react";
import Topbar from "@/components/Topbar";
import DashboardSidebar from "@/components/DashboardSidebar";

type WorkspaceMode = "personal" | "business";

const STORAGE_KEY = "adflow-sidebar-collapsed";
const MANUAL_KEY = "adflow-sidebar-manual";
const AUTO_COLLAPSE_MAX = 1280; // px — below this, auto-collapse unless user overrode

export default function DashboardShell({
  children,
}: {
  children: ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mode, setMode] = useState<WorkspaceMode>("personal");
  const [selectedOrganizationId, setSelectedOrganizationId] = useState("");
  const [preferencesLoaded, setPreferencesLoaded] = useState(false);

  /* ---- Load saved preferences once ---- */
  useEffect(() => {
    try {
      const savedCollapsed = localStorage.getItem(STORAGE_KEY) === "true";
      const manual = localStorage.getItem(MANUAL_KEY) === "true";

      const savedMode = localStorage.getItem("adflow-workspace-mode");
      if (savedMode === "personal" || savedMode === "business") {
        setMode(savedMode);
      }

      setSelectedOrganizationId(
        localStorage.getItem("adflow-organization-id") || "",
      );

      // If the user never manually toggled, decide based on viewport.
      // If they did toggle manually, respect their choice.
      if (manual) {
        setCollapsed(savedCollapsed);
      } else {
        setCollapsed(window.innerWidth < AUTO_COLLAPSE_MAX);
      }
    } catch {
      // Keep defaults when storage is unavailable.
    } finally {
      setPreferencesLoaded(true);
    }
  }, []);

  /* ---- Auto-collapse when viewport crosses the threshold (until user overrides) ---- */
  useEffect(() => {
    if (!preferencesLoaded) return;

    const mql = window.matchMedia(`(max-width: ${AUTO_COLLAPSE_MAX - 1}px)`);

    function handleChange(event: MediaQueryListEvent) {
      // Skip if the user has manually chosen a state.
      try {
        if (localStorage.getItem(MANUAL_KEY) === "true") return;
      } catch {}

      setCollapsed(event.matches);
    }

    mql.addEventListener("change", handleChange);
    return () => mql.removeEventListener("change", handleChange);
  }, [preferencesLoaded]);

  const handleModeChange = useCallback((next: WorkspaceMode) => {
    setMode(next);
    try {
      localStorage.setItem("adflow-workspace-mode", next);
    } catch {}
  }, []);

  const handleOrganizationChange = useCallback((id: string) => {
    setSelectedOrganizationId(id);
    try {
      localStorage.setItem("adflow-organization-id", id);
    } catch {}
  }, []);

  const toggleSidebar = useCallback(() => {
    setCollapsed((current) => {
      const next = !current;
      try {
        localStorage.setItem(STORAGE_KEY, String(next));
        // Mark as manual so viewport changes no longer override it.
        localStorage.setItem(MANUAL_KEY, "true");
      } catch {}
      return next;
    });
  }, []);

  /* ---- Escape closes the mobile drawer ---- */
  useEffect(() => {
    if (!mobileOpen) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setMobileOpen(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [mobileOpen]);

  const sidebarWidth = collapsed ? 76 : 264;

  return (
    <div className="min-h-screen bg-[#080b12] text-white">
      {/* Fixed top bar */}
      <header className="fixed inset-x-0 top-0 z-[100] h-[76px] border-b border-white/[0.08] bg-[#080b12]/95 backdrop-blur-xl">
        <div className="relative h-full">
          <Topbar />

          <button
            type="button"
            aria-label="Open navigation"
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen((open) => !open)}
            className="absolute left-3 top-1/2 z-[110] flex -translate-y-1/2 items-center justify-center rounded-xl border border-white/10 bg-[#111522] p-2 text-slate-300 transition hover:bg-white/10 hover:text-white lg:hidden"
          >
            <Menu size={19} />
          </button>

          <button
            type="button"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            onClick={toggleSidebar}
            className="absolute right-3 top-1/2 z-[110] hidden -translate-y-1/2 rounded-xl border border-white/10 bg-[#111522] p-2 text-slate-300 transition hover:bg-white/10 hover:text-white xl:block"
          >
            {collapsed ? <PanelLeftOpen size={17} /> : <PanelLeftClose size={17} />}
          </button>
        </div>
      </header>

      <DashboardSidebar
        collapsed={collapsed}
        mobileOpen={mobileOpen}
        mode={mode}
        selectedOrganizationId={selectedOrganizationId}
        onToggle={toggleSidebar}
        onCloseMobile={() => setMobileOpen(false)}
        onModeChange={handleModeChange}
        onOrganizationChange={handleOrganizationChange}
      />

      {/* Desktop content */}
      <div
        className="min-h-screen pt-[76px] pb-[84px] transition-[margin] duration-200 ease-out lg:ml-[var(--adflow-sidebar-width)] lg:pb-0"
        style={
          {
            "--adflow-sidebar-width": `${sidebarWidth}px`,
          } as React.CSSProperties
        }
      >
        <div className="min-h-[calc(100vh-76px)]">
          <div className="mx-auto w-full max-w-[1800px] p-4 sm:p-6 lg:p-8">
            {preferencesLoaded ? (
              children
            ) : (
              <div className="min-h-[40vh]" aria-busy="true" />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
