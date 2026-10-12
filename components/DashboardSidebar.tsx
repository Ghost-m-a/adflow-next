"use client";

import {
  Activity,
  Building2,
  CircleHelp,
  Compass,
  Home,
  LayoutDashboard,
  Megaphone,
  MessageSquare,
  Plus,
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
  { label: "Home", href: "/dashboard", icon: Home },
  { label: "Marketplace", href: "/marketplace", icon: Compass },
  { label: "Applications", href: "/dashboard/applications", icon: Users },
  { label: "My campaigns", href: "/dashboard/campaigns", icon: Megaphone },
  { label: "Earnings & payouts", href: "/dashboard/payouts", icon: Wallet },
];

const businessLinks = [
  { label: "Home", href: "/dashboard", icon: Home },
  { label: "Campaigns", href: "/dashboard/campaigns", icon: Megaphone },
  { label: "Applications", href: "/dashboard/applications", icon: MessageSquare },
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

        const result: Organization[] = Array.isArray(data)
          ? data
          : Array.isArray(data.organizations)
            ? data.organizations
            : [];

        if (cancelled) return;

        setOrganizations(result);
        setOrganizationsError("");

        if (
          result.length > 0 &&
          !result.some((org) => org._id === selectedOrganizationId)
        ) {
          onOrganizationChange(result[0]._id);
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
  const selectedOrganization = organizations.find(
    (org) => org._id === selectedOrganizationId,
  );

  function isActive(href: string) {
    if (href === "/dashboard") return pathname === href;
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  function selectWorkspace(nextMode: WorkspaceMode) {
    onModeChange(nextMode);
  }

  function selectOrganization(orgId: string) {
    onModeChange("business");
    onOrganizationChange(orgId);
  }

  // ---- Rail square styling ----
  const railBase =
    "relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border text-sm font-semibold transition";
  const railInactive =
    "border-white/[0.08] bg-white/[0.03] text-slate-400 hover:border-white/20 hover:bg-white/[0.06] hover:text-white";
  const railActive =
    "border-violet-400/60 bg-violet-500/20 text-violet-100 ring-2 ring-violet-400/30";

  return (
    <>
      {mobileOpen && (
        <button
          type="button"
          aria-label="Close navigation menu"
          onClick={onCloseMobile}
          className="fixed inset-0 top-[76px] z-[80] bg-black/60 backdrop-blur-sm lg:hidden"
        />
      )}

      {/* ===================== Desktop sidebar ===================== */}
      <aside
        data-sidebar
        data-collapsed={collapsed ? "true" : "false"}
        className={[
          "fixed bottom-0 left-0 top-[76px] z-[90] hidden flex-col border-r border-white/[0.08]",
          "bg-[#111318] transition-[width] duration-200 ease-out lg:flex",
          collapsed ? "w-[76px]" : "w-[264px]",
        ].join(" ")}
      >
        {/* ============ Workspace rail ============ */}
        <div
          className={[
            "shrink-0 border-b border-white/[0.07]",
            collapsed ? "p-2" : "px-3 pt-3 pb-2",
          ].join(" ")}
        >
          <div
            className={[
              "flex gap-2",
              collapsed
                ? "flex-col items-center"
                : "items-center overflow-x-auto pb-1",
            ].join(" ")}
          >
            {/* Personal workspace */}
            <div className="group relative">
              <button
                type="button"
                onClick={() => selectWorkspace("personal")}
                aria-label="Personal workspace"
                aria-current={mode === "personal" ? "true" : undefined}
                className={[
                  railBase,
                  mode === "personal" ? railActive : railInactive,
                ].join(" ")}
              >
                <UserRound size={18} />
              </button>

              {collapsed && (
                <span className="pointer-events-none absolute left-full top-1/2 z-[200] ml-2 hidden -translate-y-1/2 whitespace-nowrap rounded-lg bg-white px-3 py-1.5 text-xs font-medium text-slate-900 shadow-lg group-hover:block">
                  Personal
                </span>
              )}
            </div>

            {/* Business workspaces */}
            {organizations.map((org) => {
              const active =
                mode === "business" && org._id === selectedOrganizationId;
              const initial = (org.name || "?").charAt(0).toUpperCase();

              return (
                <div key={org._id} className="group relative">
                  <button
                    type="button"
                    onClick={() => selectOrganization(org._id)}
                    aria-label={org.name}
                    aria-current={active ? "true" : undefined}
                    className={[
                      railBase,
                      active ? railActive : railInactive,
                    ].join(" ")}
                  >
                    {initial}
                  </button>

                  {collapsed && (
                    <span className="pointer-events-none absolute left-full top-1/2 z-[200] ml-2 hidden -translate-y-1/2 whitespace-nowrap rounded-lg bg-white px-3 py-1.5 text-xs font-medium text-slate-900 shadow-lg group-hover:block">
                      {org.name}
                    </span>
                  )}
                </div>
              );
            })}

            {/* Create business */}
            <div className="group relative">
              <Link
                href="/dashboard/organizations/new"
                aria-label="Start a business"
                onClick={onCloseMobile}
                className={[
                  railBase,
                  "border-dashed border-white/[0.12] bg-transparent text-slate-500",
                  "hover:border-violet-400/40 hover:bg-white/[0.04] hover:text-violet-200",
                ].join(" ")}
              >
                <Plus size={18} />
              </Link>

              {collapsed && (
                <span className="pointer-events-none absolute left-full top-1/2 z-[200] ml-2 hidden -translate-y-1/2 whitespace-nowrap rounded-lg bg-white px-3 py-1.5 text-xs font-medium text-slate-900 shadow-lg group-hover:block">
                  Start a business
                </span>
              )}
            </div>

            {/* Loading hint */}
            {organizationsLoading && (
              <span
                aria-hidden="true"
                className={[
                  "h-1.5 w-1.5 animate-pulse rounded-full bg-violet-400/60",
                  collapsed ? "mt-1" : "ml-1",
                ].join(" ")}
              />
            )}
          </div>

          {/* Workspace name label (expanded only) */}
          {!collapsed && (
            <p className="mt-3 truncate px-1 text-sm font-medium text-slate-400">
              {mode === "personal"
                ? "Personal"
                : selectedOrganization?.name || "Business"}
            </p>
          )}

          {!collapsed && organizationsError && (
            <p className="mt-1 truncate px-1 text-xs text-rose-300">
              {organizationsError}
            </p>
          )}
        </div>

        {/* ============ Navigation ============ */}
        <nav className="flex-1 space-y-1 overflow-y-auto overflow-x-hidden px-2 py-3">
          {links.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);

            return (
              <div key={item.href} className="group relative">
                <Link
                  href={item.href}
                  aria-label={item.label}
                  aria-current={active ? "page" : undefined}
                  className={[
                    "flex h-11 items-center gap-3 rounded-xl text-sm transition-colors",
                    collapsed ? "justify-center px-0" : "px-3",
                    active
                      ? "bg-violet-500/15 font-medium text-violet-200"
                      : "text-slate-400 hover:bg-white/[0.045] hover:text-slate-100",
                  ].join(" ")}
                >
                  <Icon
                    size={19}
                    strokeWidth={active ? 2.2 : 1.8}
                    className={[
                      "shrink-0",
                      active
                        ? "text-violet-300"
                        : "text-slate-400 group-hover:text-white",
                    ].join(" ")}
                  />
                  <span data-sidebar-label className="truncate">
                    {item.label}
                  </span>
                </Link>

                {collapsed && (
                  <span className="pointer-events-none absolute left-full top-1/2 z-[200] ml-2 hidden -translate-y-1/2 whitespace-nowrap rounded-lg bg-white px-3 py-1.5 text-xs font-medium text-slate-900 shadow-lg group-hover:block">
                    {item.label}
                  </span>
                )}
              </div>
            );
          })}
        </nav>

        {/* ============ Footer ============ */}
        <div className="shrink-0 space-y-1 border-t border-white/[0.07] p-2">
          <div className="group relative">
            <Link
              href="/dashboard/settings"
              aria-label="Settings"
              className={[
                "flex h-11 items-center gap-3 rounded-xl text-sm transition",
                collapsed ? "justify-center px-0" : "px-3",
                isActive("/dashboard/settings")
                  ? "bg-violet-500/15 text-violet-200"
                  : "text-slate-400 hover:bg-white/[0.045] hover:text-white",
              ].join(" ")}
            >
              <Settings size={19} className="shrink-0" />
              <span data-sidebar-label className="truncate">
                Settings
              </span>
            </Link>

            {collapsed && (
              <span className="pointer-events-none absolute left-full top-1/2 z-[200] ml-2 hidden -translate-y-1/2 whitespace-nowrap rounded-lg bg-white px-3 py-1.5 text-xs font-medium text-slate-900 shadow-lg group-hover:block">
                Settings
              </span>
            )}
          </div>

          <div className="group relative">
            <Link
              href="/help"
              aria-label="Help & support"
              className={[
                "flex h-11 items-center gap-3 rounded-xl text-sm text-slate-400 transition hover:bg-white/[0.045] hover:text-white",
                collapsed ? "justify-center px-0" : "px-3",
              ].join(" ")}
            >
              <CircleHelp size={19} className="shrink-0" />
              <span data-sidebar-label className="truncate">
                Help & support
              </span>
            </Link>

            {collapsed && (
              <span className="pointer-events-none absolute left-full top-1/2 z-[200] ml-2 hidden -translate-y-1/2 whitespace-nowrap rounded-lg bg-white px-3 py-1.5 text-xs font-medium text-slate-900 shadow-lg group-hover:block">
                Help & support
              </span>
            )}
          </div>

          <div className="group relative">
            <button
              type="button"
              onClick={onToggle}
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              className={[
                "flex h-10 w-full items-center gap-2 rounded-xl border border-white/[0.07] text-xs font-medium text-slate-400 transition hover:bg-white/[0.04] hover:text-white",
                collapsed ? "justify-center px-0" : "px-3",
              ].join(" ")}
            >
              {collapsed ? (
                <LayoutDashboard size={17} className="shrink-0" />
              ) : (
                <span data-sidebar-label className="truncate">
                  Collapse sidebar
                </span>
              )}
            </button>

            {collapsed && (
              <span className="pointer-events-none absolute left-full top-1/2 z-[200] ml-2 hidden -translate-y-1/2 whitespace-nowrap rounded-lg bg-white px-3 py-1.5 text-xs font-medium text-slate-900 shadow-lg group-hover:block">
                Expand sidebar
              </span>
            )}
          </div>
        </div>
      </aside>

      {/* ===================== Mobile drawer ===================== */}
      <aside
        className={[
          "fixed bottom-0 left-0 top-[76px] z-[95] flex w-[min(300px,85vw)] flex-col overflow-hidden",
          "border-r border-white/[0.08] bg-[#111318] shadow-2xl shadow-black/40",
          "transition-transform duration-200 ease-out lg:hidden",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
        ].join(" ")}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-white/[0.08] p-4">
          <p className="text-sm font-semibold text-white">Workspaces</p>
          <button
            type="button"
            onClick={onCloseMobile}
            aria-label="Close menu"
            className="rounded-lg p-2 text-slate-400 hover:bg-white/[0.06] hover:text-white"
          >
            <X size={18} />
          </button>
        </div>

        {/* Horizontal rail */}
        <div className="flex shrink-0 gap-2 overflow-x-auto border-b border-white/[0.08] p-3">
          <button
            type="button"
            onClick={() => selectWorkspace("personal")}
            aria-label="Personal workspace"
            className={[
              railBase,
              mode === "personal" ? railActive : railInactive,
            ].join(" ")}
          >
            <UserRound size={18} />
          </button>

          {organizations.map((org) => {
            const active =
              mode === "business" && org._id === selectedOrganizationId;
            const initial = (org.name || "?").charAt(0).toUpperCase();
            return (
              <button
                key={org._id}
                type="button"
                onClick={() => selectOrganization(org._id)}
                aria-label={org.name}
                className={[
                  railBase,
                  active ? railActive : railInactive,
                ].join(" ")}
              >
                {initial}
              </button>
            );
          })}

          <Link
            href="/dashboard/organizations/new"
            aria-label="Start a business"
            onClick={onCloseMobile}
            className={[
              railBase,
              "border-dashed border-white/[0.12] bg-transparent text-slate-500",
              "hover:border-violet-400/40 hover:bg-white/[0.04] hover:text-violet-200",
            ].join(" ")}
          >
            <Plus size={18} />
          </Link>
        </div>

        <p className="shrink-0 truncate px-4 py-3 text-sm font-medium text-slate-400">
          {mode === "personal"
            ? "Personal"
            : selectedOrganization?.name || "Business"}
        </p>

        {organizationsError && (
          <p className="shrink-0 px-3 text-xs text-rose-300">
            {organizationsError}
          </p>
        )}

        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          {links.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onCloseMobile}
                className={[
                  "flex h-12 items-center gap-3 rounded-xl px-3 text-sm",
                  active
                    ? "bg-violet-500/15 font-medium text-violet-200"
                    : "text-slate-400 hover:bg-white/[0.045] hover:text-white",
                ].join(" ")}
              >
                <Icon size={19} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="shrink-0 border-t border-white/[0.08] p-3">
          <Link
            href="/dashboard/settings"
            onClick={onCloseMobile}
            className="flex h-11 items-center gap-3 rounded-xl px-3 text-sm text-slate-400 hover:bg-white/[0.045] hover:text-white"
          >
            <Settings size={19} /> Settings
          </Link>
          <Link
            href="/help"
            onClick={onCloseMobile}
            className="flex h-11 items-center gap-3 rounded-xl px-3 text-sm text-slate-400 hover:bg-white/[0.045] hover:text-white"
          >
            <CircleHelp size={19} /> Help & support
          </Link>
        </div>
      </aside>

      {/* ===================== Mobile bottom nav ===================== */}
      <nav
        aria-label="Mobile navigation"
        className="fixed inset-x-0 bottom-0 z-[70] flex h-[68px] items-stretch justify-around border-t border-white/[0.09] bg-[#111318]/[0.98] px-1 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden"
      >
        {links.slice(0, 4).map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onCloseMobile}
              aria-label={item.label}
              aria-current={active ? "page" : undefined}
              className={[
                "relative flex min-w-0 flex-1 flex-col items-center justify-center gap-1",
                active ? "text-violet-200" : "text-slate-500",
              ].join(" ")}
            >
              {active && (
                <span className="absolute left-1/2 top-0 h-[3px] w-8 -translate-x-1/2 rounded-b-full bg-violet-400" />
              )}
              <span
                className={
                  active
                    ? "flex h-9 w-10 items-center justify-center rounded-xl bg-violet-500/15"
                    : "flex h-9 w-10 items-center justify-center"
                }
              >
                <Icon size={20} strokeWidth={active ? 2.2 : 1.8} />
              </span>
              <span className="max-w-full truncate px-1 text-[10px]">
                {item.label}
              </span>
            </Link>
          );
        })}

        <button
          type="button"
          aria-label="Open menu"
          aria-expanded={mobileOpen}
          onClick={() => {
            const button = document.querySelector<HTMLButtonElement>(
              'button[aria-label="Open navigation"]',
            );
            button?.click();
          }}
          className="flex min-w-0 flex-1 flex-col items-center justify-center gap-1 text-slate-500"
        >
          <span className="flex h-9 w-10 items-center justify-center">
            <Building2 size={20} />
          </span>
          <span className="text-[10px]">Menu</span>
        </button>
      </nav>
    </>
  );
}
