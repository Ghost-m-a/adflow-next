import type { ReactNode } from "react";
import { WorkspaceShell } from "@/components/workspace/WorkspaceShell";

export default function OrganizationsLayout({
  children,
}: {
  children: ReactNode;
}) {
  return <WorkspaceShell kind="advertiser">{children}</WorkspaceShell>;
}
