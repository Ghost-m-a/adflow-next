import Link from "next/link";
import { Card, CardContent } from "@/components/ui";
import { Compass } from "lucide-react";

export default function WorkspaceNotFound() {
  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="flex flex-col items-center p-10 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-500/15 text-brand-300">
            <Compass size={22} />
          </div>
          <h1 className="mt-5 text-xl font-semibold">Page not found</h1>
          <p className="mt-2 max-w-md text-sm leading-6 text-text-muted">
            The page you tried to open doesn&apos;t exist, or you don&apos;t have
            access to it. Try going back to your workspace or searching from there.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link
              href="/advertiser"
              className="rounded-xl bg-brand-500 px-5 py-3 text-sm font-semibold text-white hover:bg-brand-600"
            >
              Advertiser workspace
            </Link>
            <Link
              href="/creator"
              className="rounded-xl border border-border-strong px-5 py-3 text-sm font-medium text-text hover:bg-white/5"
            >
              Creator workspace
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
