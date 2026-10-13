import {
  Activity,
  BarChart3,
  Building2,
  Compass,
  FileCheck2,
  FileVideo2,
  Home,
  Link2,
  Megaphone,
  Users,
  Wallet,
} from "lucide-react";

export type WorkspaceKind = "advertiser" | "creator";

export type NavItem = {
  label: string;
  href: string;
  icon: typeof Home;
  badge?: "applications" | "messages";
};

export const ADVERTISER_NAV: NavItem[] = [
  { label: "Overview",        href: "/advertiser",              icon: Home },
  { label: "Campaigns",       href: "/advertiser/campaigns",    icon: Megaphone },
  { label: "Applications",    href: "/advertiser/applications", icon: Users, badge: "applications" },
  { label: "Submissions",     href: "/advertiser/submissions",  icon: FileVideo2 },
  { label: "Analytics",       href: "/advertiser/analytics",    icon: BarChart3 },
  { label: "Wallet",          href: "/advertiser/wallet",       icon: Wallet },
  { label: "Team",            href: "/advertiser/team",         icon: Building2 },
];

export const CREATOR_NAV: NavItem[] = [
  { label: "Overview",        href: "/creator",              icon: Home },
  { label: "Discover",        href: "/creator/marketplace",  icon: Compass },
  { label: "Applications",    href: "/creator/applications", icon: Users },
  { label: "Submissions",     href: "/creator/submissions",  icon: FileCheck2 },
  { label: "Tracking links",  href: "/creator/links",        icon: Link2 },
  { label: "Earnings",        href: "/creator/earnings",     icon: Activity },
  { label: "Payouts",         href: "/creator/payouts",      icon: Wallet },
];

export const WORKSPACE_LABELS: Record<WorkspaceKind, string> = {
  advertiser: "Advertiser",
  creator: "Creator",
};

export const WORKSPACE_ICONS: Record<WorkspaceKind, typeof Home> = {
  advertiser: Building2,
  creator: Compass,
};

export function navFor(kind: WorkspaceKind): NavItem[] {
  return kind === "advertiser" ? ADVERTISER_NAV : CREATOR_NAV;
}
