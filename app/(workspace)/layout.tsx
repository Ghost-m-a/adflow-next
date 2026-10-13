import type { ReactNode } from "react";
import { WorkspaceShell } from "@/components/workspace/WorkspaceShell";

/**
 * One layout serves every authenticated page under (workspace).
 * The shell derives the workspace kind (advertiser vs creator)
 * from the current pathname, so /creator/* gets the creator nav
 * and everything else gets the advertiser nav.
 */
export default function WorkspaceLayout({
  children,
}: {
  children: ReactNode;
}) {
  return <WorkspaceShell>{children}</WorkspaceShell>;
}
