import type { ReactNode } from "react";
import { WorkspaceShell } from "@/components/workspace/WorkspaceShell";

export default function NotificationsLayout({
  children,
}: {
  children: ReactNode;
}) {
  return <WorkspaceShell kind="advertiser">{children}</WorkspaceShell>;
}
