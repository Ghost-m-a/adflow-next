"use client";

import { Menu, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import type { ReactNode } from "react";
import Topbar from "@/components/Topbar";
import DashboardSidebar from "@/components/DashboardSidebar";

type WorkspaceMode = "personal" | "business";

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

  useEffect(() => {
    try {
      setCollapsed(
        localStorage.getItem("adflow-sidebar-collapsed") === "true",
      );

      const savedMode = localStorage.getItem("adflow-workspace-mode");
      if (savedMode === "personal" || savedMode === "business") {
        setMode(savedMode);
      }

      setSelectedOrganizationId(
        localStorage.getItem("adflow-organization-id") || "",
      );
    } catch {
      // Keep defaults when browser storage is unavailable.
    } finally {
      setPreferencesLoaded(true);
    }
  }, []);

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
        localStorage.setItem("adflow-sidebar-collapsed", String(next));
      } catch {}
      return next;
    });
  }, []);

  useEffect(() => {
    if (!mobileOpen) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setMobileOpen(false);
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [mobileOpen]);

  return (
    <div className="min-h-screen bg-[#080b12] text-white">
      {/* The single fixed topbar is shared by every dashboard page. */}
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
            {collapsed ? (
              <PanelLeftOpen size={17} />
            ) : (
              <PanelLeftClose size={17} />
            )}
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

      {/* Desktop content begins below the 76px fixed header. */}
      <div
        className={[
          "min-h-screen pt-[76px] transition-[margin] duration-200 ease-out",
          "pb-[84px] lg:pb-0",
          "lg:ml-[var(--adflow-sidebar-width)]",
        ].join(" ")}
        style={
          {
            "--adflow-sidebar-width": collapsed ? "76px" : "264px",
          } as React.CSSProperties
        }
      >
        <div className="min-h-[calc(100vh-76px)]">
          <div className="mx-auto w-full max-w-[1800px] p-4 sm:p-6 lg:p-8">
            {preferencesLoaded ? children : (
              <div className="min-h-[40vh]" aria-busy="true" />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
