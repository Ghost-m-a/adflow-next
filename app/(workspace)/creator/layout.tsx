import type { ReactNode } from "react";
import { WorkspaceShell } from "@/components/workspace/WorkspaceShell";

export default function CreatorLayout({ children }: { children: ReactNode }) {
  return <WorkspaceShell kind="creator">{children}</WorkspaceShell>;
}
