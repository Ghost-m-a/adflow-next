import type { ReactNode } from "react";
import Topbar from "@/components/Topbar";
import DashboardSidebar from "@/components/DashboardSidebar";

export default function DashboardShell({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <main className="min-h-screen bg-[#080b12] text-white">
      <Topbar />
      <div className="flex min-h-[calc(100vh-76px)]">
        <DashboardSidebar />
        <div className="min-w-0 flex-1">
          <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
            {children}
          </div>
        </div>
      </div>
    </main>
  );
}
