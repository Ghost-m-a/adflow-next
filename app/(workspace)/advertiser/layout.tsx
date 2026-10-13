import type { ReactNode } from "react";
import { WorkspaceShell } from "@/components/workspace/WorkspaceShell";

export default function AdvertiserLayout({ children }: { children: ReactNode }) {
  return <WorkspaceShell kind="advertiser">{children}</WorkspaceShell>;
}
