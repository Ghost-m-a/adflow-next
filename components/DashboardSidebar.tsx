"use client";

import {
  Activity,
  Building2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  Compass,
  LayoutDashboard,
  Megaphone,
  Settings,
  UserRound,
  Users,
  Wallet,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

type Organization = {
  _id: string;
  name: string;
  type?: "advertiser" | "agency";
  role?: string;
  defaultCurrency?: string;
};

type WorkspaceMode = "personal" | "business";

type DashboardSidebarProps = {
  collapsed: boolean;
  mobileOpen: boolean;
  mode: WorkspaceMode;
  selectedOrganizationId: string;
  onToggle: () => void;
  onCloseMobile: () => void;
  onModeChange: (mode: WorkspaceMode) => void;
  onOrganizationChange: (organizationId: string) => void;
};

const personalLinks = [
  { label: "Overview", href: "/dashboard", icon: LayoutDashboard },
  { label: "Creator marketplace", href: "/marketplace", icon: Compass },
  { label: "My applications", href: "/dashboard/applications", icon: Users },
  { label: "My campaigns", href: "/dashboard/campaigns", icon: Megaphone },
  { label: "Earnings & payouts", href: "/dashboard/payouts", icon: Wallet },
];

const businessLinks = [
  { label: "Overview", href: "/dashboard", icon: LayoutDashboard },
  { label: "Campaigns", href: "/dashboard/campaigns", icon: Megaphone },
  { label: "Applications", href: "/dashboard/applications", icon: Users },
  { label: "Analytics", href: "/dashboard/analytics", icon: Activity },
  { label: "Organizations", href: "/dashboard/organizations", icon: Building2 },
];

export default function DashboardSidebar({
  collapsed,
  mobileOpen,
  mode,
  selectedOrganizationId,
  onToggle,
  onCloseMobile,
  onModeChange,
  onOrganizationChange,
}: DashboardSidebarProps) {
  const pathname = usePathname();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [organizationsLoading, setOrganizationsLoading] = useState(true);
  const [organizationsError, setOrganizationsError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadOrganizations() {
      try {
        const response = await fetch("/api/organizations/mine", {
          credentials: "same-origin",
          cache: "no-store",
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Unable to load organizations.");
        }

        const result = Array.isArray(data)
          ? data
          : Array.isArray(data.organizations)
            ? data.organizations
            : [];

        if (!cancelled) {
          setOrganizations(result);
          setOrganizationsError("");

          if (
            result.length > 0 &&
            !result.some(
              (organization: Organization) =>
                organization._id === selectedOrganizationId,
            )
          ) {
            onOrganizationChange(result[0]._id);
          }
        }
      } catch (error) {
        if (!cancelled) {
          setOrganizationsError(
            error instanceof Error
              ? error.message
              : "Unable to load organizations.",
          );
        }
      } finally {
        if (!cancelled) setOrganizationsLoading(false);
      }
    }

    void loadOrganizations();

    return () => {
      cancelled = true;
    };
  }, [onOrganizationChange, selectedOrganizationId]);

  const links = mode === "personal" ? personalLinks : businessLinks;

  function isActive(href: string) {
    if (href === "/dashboard") return pathname === href;

    return pathname === href || pathname.startsWith(`${href}/`);
  }

  const selectedOrganization = organizations.find(
    (organization) => organization._id === selectedOrganizationId,
  );

  return (
    <>
      {mobileOpen && (
        <button
          type="button"
          aria-label="Close navigation"
          onClick={onCloseMobile}
          className="fixed inset-0 top-[76px] z-[80] bg-black/60 backdrop-blur-sm lg:hidden"
        />
      )}

      <aside
        className={[
          "fixed z-[90] flex flex-col border-white/[0.08] bg-[#0b0e17]",
          "transition-[width,transform,bottom] duration-200 ease-out",
          "left-0 top-[76px] bottom-0 border-r",
          collapsed ? "w-[76px]" : "w-[264px]",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
          "lg:translate-x-0",
          "max-lg:inset-x-0 max-lg:top-auto max-lg:bottom-0",
          "max-lg:h-[76px] max-lg:w-full max-lg:flex-row max-lg:border-r-0",
          "max-lg:border-t max-lg:pb-[env(safe-area-inset-bottom)]",
          "max-lg:overflow-visible",
        ].join(" ")}
      >
        {/* Workspace selector */}
        <div className="border-b border-white/[0.07] p-3 max-lg:hidden">
          <div className="mb-2 flex items-center justify-between px-2">
            {!collapsed && (
              <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                Workspace
              </span>
            )}

            <button
              type="button"
              onClick={onCloseMobile}
              aria-label="Close sidebar"
              className="rounded-lg p-1.5 text-slate-400 hover:bg-white/[0.06] hover:text-white lg:hidden"
            >
              <X size={17} />
            </button>
          </div>

          <div className={`grid ${collapsed ? "grid-cols-1" : "grid-cols-2"} gap-1 rounded-xl border border-white/[0.07] bg-[#070a12] p-1`}>
            <button
              type="button"
              title="Personal workspace"
              onClick={() => onModeChange("personal")}
              className={[
                "flex min-w-0 items-center justify-center gap-2 rounded-lg px-2 py-2.5 text-xs font-medium transition",
                mode === "personal"
                  ? "bg-violet-500/15 text-violet-200 ring-1 ring-violet-400/20"
                  : "text-slate-400 hover:text-white",
              ].join(" ")}
            >
              <UserRound size={16} />
              {!collapsed && <span>Personal</span>}
            </button>

            <button
              type="button"
              title="Business workspace"
              onClick={() => onModeChange("business")}
              className={[
                "flex min-w-0 items-center justify-center gap-2 rounded-lg px-2 py-2.5 text-xs font-medium transition",
                mode === "business"
                  ? "bg-violet-500/15 text-violet-200 ring-1 ring-violet-400/20"
                  : "text-slate-400 hover:text-white",
              ].join(" ")}
            >
              <Building2 size={16} />
              <span>Business</span>
            </button>
          </div>

          {mode === "business" && !collapsed && (
            <div className="mt-3">
              <label
                htmlFor="sidebar-organization"
                className="mb-1.5 block text-xs text-slate-400"
              >
                Active organization
              </label>

              <div className="relative">
                <select
                  id="sidebar-organization"
                  value={selectedOrganizationId}
                  onChange={(event) =>
                    onOrganizationChange(event.target.value)
                  }
                  disabled={organizationsLoading || organizations.length === 0}
                  className="w-full appearance-none rounded-xl border border-white/[0.08] bg-[#111522] py-2.5 pl-3 pr-8 text-xs text-slate-200 outline-none transition focus:border-violet-400/50 disabled:opacity-50"
                >
                  {organizationsLoading && (
                    <option value="">Loading organizations...</option>
                  )}

                  {!organizationsLoading && organizations.length === 0 && (
                    <option value="">No organizations yet</option>
                  )}

                  {organizations.map((organization) => (
                    <option key={organization._id} value={organization._id}>
                      {organization.name}
                    </option>
                  ))}
                </select>

                <ChevronDown
                  size={14}
                  className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-500"
                />
              </div>

              {organizationsError && (
                <p className="mt-2 text-xs text-rose-300">
                  {organizationsError}
                </p>
              )}

              {!organizationsLoading &&
                organizations.length === 0 &&
                !organizationsError && (
                  <Link
                    href="/dashboard/organizations/new"
                    onClick={onCloseMobile}
                    className="mt-2 block text-xs text-violet-300 hover:text-violet-200"
                  >
                    + Create organization
                  </Link>
                )}

              {selectedOrganization && (
                <p className="mt-2 truncate px-1 text-[10px] text-slate-500">
                  {selectedOrganization.role
                    ? `Role: ${selectedOrganization.role}`
                    : selectedOrganization.type || "Organization"}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-5 max-lg:flex max-lg:items-center max-lg:justify-around max-lg:overflow-visible max-lg:px-1 max-lg:py-1">
          {!collapsed && (
            <p className="mb-3 px-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500 max-lg:hidden">
              {mode === "personal" ? "Your workspace" : "Manage business"}
            </p>
          )}

          {links.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onCloseMobile}
                title={collapsed ? item.label : undefined}
                aria-current={active ? "page" : undefined}
                className={[
                  "group relative flex items-center gap-3 rounded-xl px-3 py-3 text-sm transition-colors",
                  collapsed ? "justify-center" : "",
                  "max-lg:flex-1 max-lg:flex-col max-lg:justify-center max-lg:gap-1 max-lg:px-1 max-lg:py-2 max-lg:text-[10px]",
                  active
                    ? "bg-violet-500/12 font-medium text-violet-200"
                    : "text-slate-400 hover:bg-white/[0.045] hover:text-slate-100",
                ].join(" ")}
              >
                {active && (
                  <span className="absolute bottom-2 left-0 top-2 w-[3px] rounded-r-full bg-violet-400" />
                )}

                <Icon
                  size={19}
                  strokeWidth={active ? 2.2 : 1.8}
                  className={
                    active
                      ? "shrink-0 text-violet-300"
                      : "shrink-0 text-slate-500 group-hover:text-slate-200"
                  }
                />

                <span className={collapsed ? "hidden" : "truncate max-lg:block max-lg:max-w-full max-lg:text-center"}>
                  {item.label}
                </span>
              </Link>
            );
          })}
        </nav>

        {/* Bottom links and collapse */}
        <div className="border-t border-white/[0.07] p-3 max-lg:flex max-lg:items-center max-lg:gap-1 max-lg:border-l max-lg:border-t-0 max-lg:px-2 max-lg:py-1">
          <Link
            href="/dashboard/settings"
            onClick={onCloseMobile}
            title={collapsed ? "Settings" : undefined}
            className={[
              "flex items-center gap-3 rounded-xl px-3 py-3 text-sm transition",
              isActive("/dashboard/settings")
                ? "bg-violet-500/12 text-violet-200"
                : "text-slate-400 hover:bg-white/[0.045] hover:text-white",
              collapsed ? "justify-center" : "",
              "max-lg:mt-0 max-lg:flex-1 max-lg:flex-col max-lg:gap-1 max-lg:px-1 max-lg:py-2 max-lg:text-[10px]",
            ].join(" ")}
          >
            <Settings size={19} />
            <span className={collapsed ? "hidden" : "max-lg:block max-lg:text-center"}>Settings</span>
          </Link>

          <Link
            href="/help"
            onClick={onCloseMobile}
            title={collapsed ? "Help" : undefined}
            className={[
              "mt-1 flex items-center gap-3 rounded-xl px-3 py-3 text-sm text-slate-400 transition hover:bg-white/[0.045] hover:text-white",
              collapsed ? "justify-center" : "",
              "max-lg:hidden",
            ].join(" ")}
          >
            <CircleHelp size={19} />
            {!collapsed && <span>Help & support</span>}
          </Link>

          <button
            type="button"
            onClick={onToggle}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className="mt-3 hidden w-full items-center justify-center gap-2 rounded-xl border border-white/[0.07] py-2.5 text-xs text-slate-400 transition hover:bg-white/[0.04] hover:text-white lg:flex"
          >
            {collapsed ? (
              <ChevronRight size={17} />
            ) : (
              <>
                <ChevronLeft size={17} />
                <span>Collapse sidebar</span>
              </>
            )}
          </button>
        </div>
      </aside>
    </>
  );
}
