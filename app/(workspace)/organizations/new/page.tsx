"use client";

import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui";
import { OrganizationForm } from "@/components/organizations/OrganizationForm";

export default function NewOrganizationPage() {
  const router = useRouter();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-400">
          Workspace setup
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
          Create an organization
        </h1>
        <p className="mt-2 text-sm text-text-muted">
          You will automatically become the owner of this organization.
        </p>
      </header>

      <Card>
        <CardContent className="p-5 sm:p-6">
          <OrganizationForm
            mode="create"
            onSuccess={(org) => {
              router.push(`/organizations/${org._id}`);
              router.refresh();
            }}
            onCancel={() => router.push("/organizations")}
          />
        </CardContent>
      </Card>
    </div>
  );
}
