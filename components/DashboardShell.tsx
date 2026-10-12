"use client";

import {
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import type { ReactNode } from "react";
import Topbar from "@/components/Topbar";
import DashboardSidebar from "@/components/DashboardSidebar";

type WorkspaceMode = "personal" | "business";

type DashboardShellProps = {
  children: ReactNode;
};

export default function DashboardShell({
  children,
}: DashboardShellProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mode, setMode] = useState<WorkspaceMode>("personal");
  const [selectedOrganizationId, setSelectedOrganizationId] = useState("");

  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem("adflow-sidebar-collapsed") === "true");

      const savedMode = localStorage.getItem("adflow-workspace-mode");
      if (savedMode === "personal" || savedMode === "business") {
        setMode(savedMode);
      }

      setSelectedOrganizationId(
        localStorage.getItem("adflow-organization-id") || "",
      );
    } catch {
      // The shell remains usable when browser storage is unavailable.
    }
  }, []);

  const handleModeChange = useCallback((nextMode: WorkspaceMode) => {
    setMode(nextMode);

    try {
      localStorage.setItem("adflow-workspace-mode", nextMode);
    } catch {
      // Keep the current selection in React state.
    }
  }, []);

  const handleOrganizationChange = useCallback((id: string) => {
    setSelectedOrganizationId(id);

    try {
      localStorage.setItem("adflow-organization-id", id);
    } catch {
      // Keep the current selection in React state.
    }
  }, []);

  function toggleSidebar() {
    setCollapsed((current) => {
      const next = !current;

      try {
        localStorage.setItem("adflow-sidebar-collapsed", String(next));
      } catch {
        // The current page still works without persistence.
      }

      return next;
    });
  }

  return (
    <div className="min-h-screen bg-[#080b12] text-white">
      {/* Fixed top navigation; its existing authentication stays intact. */}
      <div className="fixed inset-x-0 top-0 z-50 bg-[#080b12]">
        <div className="relative pl-12 lg:pl-0">
          <Topbar />

          <button
            type="button"
            aria-label="Open navigation"
            onClick={() => setMobileOpen(true)}
            className="absolute left-3 top-1/2 z-[80] -translate-y-1/2 rounded-lg border border-white/10 bg-[#111522] p-2 text-slate-300 transition hover:bg-white/10 hover:text-white lg:hidden"
          >
            <Menu size={18} />
          </button>

          <button
            type="button"
            aria-label={collapsed ? "Expand sidebar" : "Hide sidebar"}
            title={collapsed ? "Expand sidebar" : "Hide sidebar"}
            onClick={toggleSidebar}
            className="absolute right-3 top-1/2 z-[80] hidden -translate-y-1/2 rounded-lg border border-white/10 bg-[#111522] p-2 text-slate-300 transition hover:bg-white/10 hover:text-white xl:block"
          >
            {collapsed ? (
              <PanelLeftOpen size={17} />
            ) : (
              <PanelLeftClose size={17} />
            )}
          </button>
        </div>
      </div>

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

      {/* Only page content scrolls; navigation remains fixed. */}
      <div
        className={`min-h-screen pt-16 transition-[margin] duration-200 ${
          collapsed ? "lg:ml-[76px]" : "lg:ml-[264px]"
        }`}
      >
        <div className="h-[calc(100vh-4rem)] overflow-y-auto overscroll-contain">
          <div className="mx-auto w-full max-w-[1800px] p-4 sm:p-6 lg:p-8">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
