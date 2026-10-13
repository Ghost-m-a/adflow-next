"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Badge,
  Button,
  Card,
  CardContent,
  EmptyState,
  Skeleton,
} from "@/components/ui";
import { Building2, MoreVertical, Pencil, Plus, Trash2, Users } from "lucide-react";

type Organization = {
  _id: string;
  name: string;
  slug: string;
  type: "advertiser" | "agency";
  defaultCurrency: string;
  role: string;
};

export default function OrganizationsPage() {
  const router = useRouter();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/organizations/mine", { cache: "no-store" });
      if (res.status === 401) {
        router.replace("/login");
        return;
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Unable to load organizations.");
      setOrganizations(data.organizations || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load organizations.");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!menuOpen) return;
    function close() {
      setMenuOpen(null);
    }
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [menuOpen]);

  async function handleDelete(org: Organization) {
    setMenuOpen(null);

    const confirmed = window.confirm(
      `Delete "${org.name}"? This removes all members and invitations. This action cannot be undone.`,
    );
    if (!confirmed) return;

    setDeleting(org._id);
    setError("");
    try {
      const res = await fetch(`/api/organizations/${org._id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Unable to delete organization.");
      setOrganizations((current) => current.filter((o) => o._id !== org._id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to delete organization.");
    } finally {
      setDeleting(null);
    }
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-400">
            Management
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
            Organizations
          </h1>
          <p className="mt-2 text-sm text-text-muted">
            Workspaces you own or have been invited to.
          </p>
        </div>
        <Link href="/organizations/new">
          <Button>
            <Plus size={16} />
            Create organization
          </Button>
        </Link>
      </header>

      {error && (
        <div
          role="alert"
          className="rounded-xl border border-red-400/20 bg-red-400/10 p-4 text-sm text-red-300"
        >
          {error}
          <button onClick={() => void load()} className="ml-3 underline">
            Retry
          </button>
        </div>
      )}

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-44" />
          ))}
        </div>
      ) : organizations.length === 0 ? (
        <EmptyState
          icon={<Building2 size={20} />}
          title="No organizations yet"
          description="Create your first organization to start running campaigns and working with creators."
          action={
            <Link href="/organizations/new">
              <Button>Create organization</Button>
            </Link>
          }
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {organizations.map((org) => {
            const canManage = org.role === "owner" || org.role === "admin";
            const canDelete = org.role === "owner";

            return (
              <Card
                key={org._id}
                className="relative transition hover:border-border-strong"
              >
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <Link
                      href={`/organizations/${org._id}`}
                      className="min-w-0 flex-1"
                    >
                      <h2 className="truncate text-lg font-semibold">
                        {org.name}
                      </h2>
                      <p className="mt-1 text-xs capitalize text-text-subtle">
                        {org.type} workspace
                      </p>
                    </Link>

                    <div className="flex items-center gap-2">
                      <Badge variant={org.role === "owner" ? "brand" : "default"}>
                        {org.role}
                      </Badge>

                      {canManage && (
                        <div
                          className="relative"
                          onPointerDown={(e) => e.stopPropagation()}
                        >
                          <button
                            type="button"
                            aria-label="Organization actions"
                            onClick={() =>
                              setMenuOpen((v) => (v === org._id ? null : org._id))
                            }
                            className="rounded-lg p-1.5 text-text-muted hover:bg-white/5 hover:text-text"
                          >
                            <MoreVertical size={16} />
                          </button>

                          {menuOpen === org._id && (
                            <div
                              role="menu"
                              className="absolute right-0 top-full z-30 mt-1 w-44 overflow-hidden rounded-xl border border-border bg-surface-2 p-1 shadow-xl"
                            >
                              <Link
                                href={`/organizations/${org._id}`}
                                role="menuitem"
                                className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-text-muted hover:bg-white/5 hover:text-text"
                              >
                                <Users size={15} /> View details
                              </Link>

                              <Link
                                href={`/organizations/${org._id}?tab=settings`}
                                role="menuitem"
                                className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-text-muted hover:bg-white/5 hover:text-text"
                              >
                                <Pencil size={15} /> Edit
                              </Link>

                              {canDelete && (
                                <button
                                  type="button"
                                  role="menuitem"
                                  disabled={deleting === org._id}
                                  onClick={() => void handleDelete(org)}
                                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-red-300 hover:bg-red-500/10 disabled:opacity-50"
                                >
                                  <Trash2 size={15} />
                                  {deleting === org._id ? "Deleting…" : "Delete"}
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <dl className="mt-5 space-y-2 text-sm">
                    <div className="flex justify-between gap-3">
                      <dt className="text-text-subtle">Currency</dt>
                      <dd>{org.defaultCurrency}</dd>
                    </div>
                    <div className="flex justify-between gap-3">
                      <dt className="text-text-subtle">Slug</dt>
                      <dd className="max-w-[65%] truncate text-text-muted">
                        {org.slug}
                      </dd>
                    </div>
                  </dl>

                  <Link
                    href={`/organizations/${org._id}`}
                    className="mt-5 inline-flex w-full items-center justify-center rounded-xl border border-border px-4 py-2.5 text-sm font-medium text-text-muted transition hover:border-brand-400/40 hover:bg-white/[0.04] hover:text-text"
                  >
                    Manage
                  </Link>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
