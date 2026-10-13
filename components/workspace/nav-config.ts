import {
  Activity,
  BarChart3,
  Bell,
  Briefcase,
  Building2,
  Compass,
  FileCheck2,
  FileVideo2,
  Home,
  LayoutDashboard,
  Link2,
  Mail,
  Megaphone,
  Receipt,
  Users,
  Wallet,
} from "lucide-react";

export type WorkspaceKind = "advertiser" | "creator";

export type NavItem = {
  label: string;
  href: string;
  icon: typeof Home;
  badge?: "applications" | "messages";
  /** Shown in the mobile bottom navigation. Pick exactly 4 per workspace. */
  primary?: boolean;
};

export const ADVERTISER_NAV: NavItem[] = [
  {
    label: "Overview",
    href: "/advertiser",
    icon: Home,
    primary: true,
  },
  {
    label: "Campaigns",
    href: "/advertiser/campaigns",
    icon: Megaphone,
    primary: true,
  },
  {
    label: "Applications",
    href: "/advertiser/applications",
    icon: Users,
    badge: "applications",
    primary: true,
  },
  {
    label: "Analytics",
    href: "/advertiser/analytics",
    icon: BarChart3,
    primary: true,
  },
  {
    label: "Discover creators",
    href: "/discover-creators",
    icon: Compass,
  },
  {
    label: "Conversions",
    href: "/advertiser/conversions",
    icon: Activity,
  },
  {
    label: "Submissions",
    href: "/advertiser/submissions",
    icon: FileVideo2,
  },
  {
    label: "Wallet",
    href: "/advertiser/wallet",
    icon: Wallet,
  },
  {
    label: "Team",
    href: "/advertiser/team",
    icon: Building2,
  },
  {
    label: "Organizations",
    href: "/organizations",
    icon: LayoutDashboard,
  },
  {
    label: "Agency",
    href: "/agency",
    icon: Briefcase,
  },
  {
    label: "Notifications",
    href: "/notifications",
    icon: Bell,
  },
];

export const CREATOR_NAV: NavItem[] = [
  {
    label: "Overview",
    href: "/creator",
    icon: Home,
    primary: true,
  },
  {
    label: "Discover",
    href: "/creator/marketplace",
    icon: Compass,
    primary: true,
  },
  {
    label: "Applications",
    href: "/creator/applications",
    icon: Users,
    primary: true,
  },
  {
    label: "Earnings",
    href: "/creator/earnings",
    icon: Activity,
    primary: true,
  },
  {
    label: "Invitations",
    href: "/creator/invitations",
    icon: Mail,
  },
  {
    label: "Submissions",
    href: "/creator/submissions",
    icon: FileCheck2,
  },
  {
    label: "Tracking links",
    href: "/creator/links",
    icon: Link2,
  },
  {
    label: "Payouts",
    href: "/creator/payouts",
    icon: Wallet,
  },
  {
    label: "Tax",
    href: "/creator/tax",
    icon: Receipt,
  },
  {
    label: "Notifications",
    href: "/notifications",
    icon: Bell,
  },
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
