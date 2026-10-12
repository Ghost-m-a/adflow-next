import type { OrganizationRole } from "@/models/Membership";

export const ORGANIZATION_PERMISSIONS = {
  manageOrganization: ["owner", "admin"],
  manageMembers: ["owner", "admin"],
  manageCampaigns: ["owner", "admin", "manager"],
  manageApplications: ["owner", "admin", "manager"],
  reviewSubmissions: ["owner", "admin", "manager"],
  viewAnalytics: ["owner", "admin", "manager", "member", "viewer"],
  viewBilling: ["owner", "admin"],
  manageBilling: ["owner", "admin"],
} as const satisfies Record<string, readonly OrganizationRole[]>;

export type OrganizationPermission =
  keyof typeof ORGANIZATION_PERMISSIONS;

export function hasPermission(
  role: OrganizationRole,
  permission: OrganizationPermission
): boolean {
  return (
    ORGANIZATION_PERMISSIONS[permission] as readonly OrganizationRole[]
  ).includes(role);
}
