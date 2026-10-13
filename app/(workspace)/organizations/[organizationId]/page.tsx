"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Badge,
  Button,
  Card,
  CardContent,
  EmptyState,
  Skeleton,
} from "@/components/ui";
import {
  Building2,
  ShieldAlert,
  Trash2,
  UserMinus,
  Users,
} from "lucide-react";
import { OrganizationForm } from "@/components/organizations/OrganizationForm";

type Organization = {
  _id: string;
  name: string;
  slug: string;
  type: "advertiser" | "agency";
  description?: string;
  website?: string;
  defaultCurrency: string;
  role: string;
  ownerId: string;
};

type Member = {
  _id: string;
  userId: string;
  name: string;
  username: string;
  email: string;
  role: string;
  joinedAt?: string;
};

const TABS = ["overview", "members", "settings"] as const;
type Tab = (typeof TABS)[number];

export default function OrganizationDetailPage() {
  const params = useParams<{ organizationId: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const organizationId = params.organizationId;

  const initialTab =
    (searchParams.get("tab") as Tab) && TABS.includes(searchParams.get("tab") as Tab)
      ? (searchParams.get("tab") as Tab)
      : "overview";

  const [tab, setTab] = useState<Tab>(initialTab);
  const [org, setOrg] = useState<Organization | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [membersLoading, setMembersLoading] = useState(true);
  const [error, setError] = useState("");
  const [updatingMember, setUpdatingMember] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadOrg = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/organizations/${organizationId}`, {
        cache: "no-store",
      });
      if (res.status === 401) {
        router.replace("/login");
        return;
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Unable to load organization.");
      setOrg(data.organization);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load organization.");
    } finally {
      setLoading(false);
    }
  }, [organizationId, router]);

  const loadMembers = useCallback(async () => {
    setMembersLoading(true);
    try {
      const res = await fetch(`/api/organizations/${organizationId}/members`, {
        cache: "no-store",
      });
      if (!res.ok) return;
      const data = await res.json();
      setMembers(data.members || []);
    } finally {
      setMembersLoading(false);
    }
  }, [organizationId]);

  useEffect(() => {
    void loadOrg();
  }, [loadOrg]);

  useEffect(() => {
    if (tab === "members") void loadMembers();
  }, [tab, loadMembers]);

  async function changeRole(userId: string, role: string) {
    setUpdatingMember(userId);
    setError("");
    try {
      const res = await fetch(
        `/api/organizations/${organizationId}/members/${userId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ role }),
        },
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Unable to update role.");
      setMembers((current) =>
        current.map((m) => (m.userId === userId ? { ...m, role } : m)),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update role.");
    } finally {
      setUpdatingMember(null);
    }
  }

  async function removeMember(userId: string, name: string) {
    if (!window.confirm(`Remove ${name || "this member"} from the organization?`)) return;
    setUpdatingMember(userId);
    setError("");
    try {
      const res = await fetch(
        `/api/organizations/${organizationId}/members/${userId}`,
        { method: "DELETE" },
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Unable to remove member.");
      setMembers((current) => current.filter((m) => m.userId !== userId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to remove member.");
    } finally {
      setUpdatingMember(null);
    }
  }

  async function deleteOrganization() {
    if (!org) return;
    const confirmed = window.confirm(
      `Delete "${org.name}"? This removes all members and invitations and cannot be undone.`,
    );
    if (!confirmed) return;

    setDeleting(true);
    setError("");
    try {
      const res = await fetch(`/api/organizations/${organizationId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Unable to delete organization.");
      router.push("/organizations");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to delete organization.");
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-32" />
      </div>
    );
  }

  if (!org) {
    return (
      <EmptyState
        icon={<Building2 size={20} />}
        title="Organization not found"
        description="It may have been deleted, or you may not have access."
        action={
          <Link href="/organizations">
            <Button variant="outline">Back to organizations</Button>
          </Link>
        }
      />
    );
  }

  const canManage = org.role === "owner" || org.role === "admin";
  const canDelete = org.role === "owner";

  return (
    <div className="space-y-6">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div>
          <Link
            href="/organizations"
            className="text-xs text-text-muted hover:text-text"
          >
            ← Back to organizations
          </Link>
          <div className="mt-2 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-500/15 text-brand-300">
              <Building2 size={20} />
            </div>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                {org.name}
              </h1>
              <p className="mt-1 text-xs capitalize text-text-subtle">
                {org.type} workspace · {org.defaultCurrency}
              </p>
            </div>
          </div>
        </div>
        <Badge variant={org.role === "owner" ? "brand" : "default"}>
          {org.role}
        </Badge>
      </header>

      {error && (
        <div
          role="alert"
          className="rounded-xl border border-red-400/20 bg-red-400/10 p-4 text-sm text-red-300"
        >
          {error}
        </div>
      )}

      <nav className="flex gap-1 border-b border-border">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={[
              "relative px-4 py-3 text-sm capitalize transition",
              tab === t
                ? "font-semibold text-text"
                : "text-text-muted hover:text-text",
            ].join(" ")}
          >
            {t}
            {tab === t && (
              <span className="absolute bottom-[-1px] left-2 right-2 h-[2px] rounded-full bg-brand-400" />
            )}
          </button>
        ))}
      </nav>

      {tab === "overview" && (
        <Card>
          <CardContent className="p-5 sm:p-6">
            <h2 className="text-base font-semibold">Overview</h2>
            <dl className="mt-4 divide-y divide-border">
              <Row label="Name" value={org.name} />
              <Row label="Slug" value={org.slug} />
              <Row label="Type" value={org.type} />
              <Row label="Currency" value={org.defaultCurrency} />
              <Row
                label="Description"
                value={org.description?.trim() || "Not provided"}
              />
              <Row
                label="Website"
                value={org.website?.trim() || "Not provided"}
              />
            </dl>
          </CardContent>
        </Card>
      )}

      {tab === "members" && (
        <Card>
          <CardContent className="p-5 sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-base font-semibold">
                Members
                <span className="ml-2 text-sm font-normal text-text-muted">
                  {members.length}
                </span>
              </h2>
              <Users size={18} className="text-text-muted" />
            </div>

            {membersLoading ? (
              <div className="mt-4 space-y-3">
                <Skeleton className="h-14" />
                <Skeleton className="h-14" />
              </div>
            ) : members.length === 0 ? (
              <p className="mt-4 text-sm text-text-muted">
                No members yet. Invite people from the invitations API.
              </p>
            ) : (
              <ul className="mt-4 divide-y divide-border">
                {members.map((m) => {
                  const isOwner = m.userId === org.ownerId;
                  const isUpdating = updatingMember === m.userId;
                  const canChange = canManage && !isOwner;
                  const canGrantAdmin = org.role === "owner";

                  return (
                    <li
                      key={m._id}
                      className="flex flex-col justify-between gap-3 py-4 sm:flex-row sm:items-center"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-medium">
                          {m.name || m.username || "Member"}
                          {isOwner && (
                            <span className="ml-2 text-xs font-normal text-brand-300">
                              (owner)
                            </span>
                          )}
                        </p>
                        <p className="mt-0.5 truncate text-xs text-text-subtle">
                          @{m.username} · {m.email}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        {canChange ? (
                          <select
                            value={m.role}
                            disabled={isUpdating}
                            onChange={(e) => void changeRole(m.userId, e.target.value)}
                            className="rounded-lg border border-border bg-surface-2 px-2.5 py-1.5 text-xs capitalize"
                          >
                            <option value="viewer">Viewer</option>
                            <option value="member">Member</option>
                            <option value="manager">Manager</option>
                            {canGrantAdmin && <option value="admin">Admin</option>}
                          </select>
                        ) : (
                          <Badge variant="default">{m.role}</Badge>
                        )}

                        {canChange && (
                          <button
                            type="button"
                            disabled={isUpdating}
                            onClick={() =>
                              void removeMember(m.userId, m.name || m.username)
                            }
                            aria-label={`Remove ${m.username}`}
                            className="rounded-lg p-1.5 text-red-300 hover:bg-red-500/10 disabled:opacity-50"
                          >
                            <UserMinus size={15} />
                          </button>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      )}

      {tab === "settings" && (
        <div className="space-y-6">
          <Card>
            <CardContent className="p-5 sm:p-6">
              <h2 className="text-base font-semibold">Edit organization</h2>
              <p className="mt-1 text-sm text-text-muted">
                Update the name, type, description, website, and default currency.
              </p>

              {canManage ? (
                <div className="mt-5">
                  <OrganizationForm
                    mode="edit"
                    organizationId={org._id}
                    initial={{
                      name: org.name,
                      type: org.type,
                      description: org.description ?? "",
                      website: org.website ?? "",
                      defaultCurrency: org.defaultCurrency,
                    }}
                    onSuccess={(updated) => {
                      setOrg((current) =>
                        current ? { ...current, ...updated } : current,
                      );
                    }}
                  />
                </div>
              ) : (
                <p className="mt-4 text-sm text-text-muted">
                  Only owners and admins can edit this organization.
                </p>
              )}
            </CardContent>
          </Card>

          {canDelete && (
            <Card className="border-red-500/20 bg-red-500/[0.03]">
              <CardContent className="p-5 sm:p-6">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-500/15 text-red-300">
                    <ShieldAlert size={18} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h2 className="text-base font-semibold text-red-200">
                      Danger zone
                    </h2>
                    <p className="mt-1 text-sm text-text-muted">
                      Deleting an organization removes all members and invitations.
                      This action cannot be undone. Campaigns must be archived first.
                    </p>
                    <Button
                      variant="danger"
                      className="mt-4"
                      onClick={() => void deleteOrganization()}
                      loading={deleting}
                    >
                      <Trash2 size={15} />
                      Delete organization
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1 py-4 sm:grid-cols-[180px_1fr] sm:gap-4">
      <dt className="text-sm text-text-muted">{label}</dt>
      <dd className="break-words text-sm font-medium">{value}</dd>
    </div>
  );
}
