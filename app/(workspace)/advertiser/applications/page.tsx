"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

type Campaign = {
   _id: string;
   title: string;
   status: string;
};

type Application = {
   _id: string;
   campaignId?: string;
   creatorId?: string;
   creatorProfileId?: {
      displayName?: string;
      username?: string;
      avatarUrl?: string;
      country?: string;
      niches?: string[];
   } | null;
   message?: string;
   proposedRate?: number;
   status: "pending" | "accepted" | "rejected" | "withdrawn";
   createdAt?: string;
};

type ApplicationItem = {
   application: Application;
   campaign: Campaign;
};

export default function ApplicationsPage() {
   const [items, setItems] = useState<ApplicationItem[]>([]);
   const [loading, setLoading] = useState(true);
   const [error, setError] = useState("");
   const [filter, setFilter] = useState("all");
   const [updating, setUpdating] = useState<string | null>(null);

   const loadApplications = useCallback(async () => {
      setLoading(true);
      setError("");

      try {
         const campaignsResponse = await fetch("/api/campaigns", {
            cache: "no-store",
         });

         const campaignsData = await campaignsResponse.json();

         if (!campaignsResponse.ok) {
            throw new Error(
               campaignsData.error || "Could not load your campaigns.",
            );
         }

         const campaigns: Campaign[] = campaignsData.campaigns || [];

         const results = await Promise.all(
            campaigns.map(async (campaign) => {
               try {
                  const response = await fetch(
                     `/api/campaigns/${campaign._id}/applications`,
                     { cache: "no-store" },
                  );

                  // Campaigns the current user cannot manage are skipped.
                  if (response.status === 403 || response.status === 404) {
                     return [];
                  }

                  const data = await response.json();

                  if (!response.ok) return [];

                  return (data.applications || []).map(
                     (application: Application) => ({
                        application,
                        campaign,
                     }),
                  );
               } catch {
                  return [];
               }
            }),
         );

         setItems(results.flat());
      } catch (err) {
         setError(
            err instanceof Error
               ? err.message
               : "Something went wrong while loading applications.",
         );
      } finally {
         setLoading(false);
      }
   }, []);

   useEffect(() => {
      void loadApplications();
   }, [loadApplications]);

   async function updateApplication(
      campaignId: string,
      applicationId: string,
      status: "accepted" | "rejected",
   ) {
      const key = `${campaignId}:${applicationId}`;
      setUpdating(key);
      setError("");

      try {
         const response = await fetch(
            `/api/campaigns/${campaignId}/applications/${applicationId}`,
            {
               method: "PATCH",
               headers: { "Content-Type": "application/json" },
               body: JSON.stringify({ status }),
            },
         );

         const data = await response.json();

         if (!response.ok) {
            throw new Error(data.error || "Could not update this application.");
         }

         await loadApplications();
      } catch (err) {
         setError(
            err instanceof Error
               ? err.message
               : "Could not update this application.",
         );
      } finally {
         setUpdating(null);
      }
   }

   const visibleItems = items.filter(
      ({ application }) => filter === "all" || application.status === filter,
   );

   const pendingCount = items.filter(
      ({ application }) => application.status === "pending",
   ).length;

   return (
      <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-900 sm:px-6 lg:px-8">
         <div className="mx-auto max-w-6xl">
            <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
               <div>
                  <p className="mb-2 text-sm font-medium text-violet-600">
                     Campaign management
                  </p>
                  <h1 className="text-3xl font-bold tracking-tight">
                     Creator applications
                  </h1>
                  <p className="mt-2 text-sm text-slate-500">
                     Review applicants and manage your campaign partnerships.
                  </p>
               </div>

               <Link
                  href="/dashboard/campaigns"
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold hover:bg-slate-100"
               >
                  View campaigns
               </Link>
            </div>

            <div className="mb-6 grid gap-4 sm:grid-cols-3">
               <div className="rounded-2xl border border-slate-200 bg-white p-5">
                  <p className="text-sm text-slate-500">Total applications</p>
                  <p className="mt-2 text-3xl font-bold">{items.length}</p>
               </div>
               <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
                  <p className="text-sm text-amber-800">Awaiting review</p>
                  <p className="mt-2 text-3xl font-bold text-amber-900">
                     {pendingCount}
                  </p>
               </div>
               <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
                  <p className="text-sm text-emerald-800">Accepted</p>
                  <p className="mt-2 text-3xl font-bold text-emerald-900">
                     {
                        items.filter(
                           ({ application }) =>
                              application.status === "accepted",
                        ).length
                     }
                  </p>
               </div>
            </div>

            {error && (
               <div
                  role="alert"
                  className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
               >
                  {error}
               </div>
            )}

            <div className="mb-5 flex flex-wrap gap-2">
               {["all", "pending", "accepted", "rejected", "withdrawn"].map(
                  (status) => (
                     <button
                        key={status}
                        onClick={() => setFilter(status)}
                        className={`rounded-full px-4 py-2 text-sm font-medium capitalize transition ${
                           filter === status
                              ? "bg-violet-600 text-white"
                              : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-100"
                        }`}
                     >
                        {status === "all" ? "All applications" : status}
                     </button>
                  ),
               )}
            </div>

            {loading ? (
               <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-slate-500">
                  Loading applications…
               </div>
            ) : visibleItems.length === 0 ? (
               <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
                  <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-50 text-xl">
                     ✦
                  </div>
                  <h2 className="text-lg font-semibold">
                     No applications found
                  </h2>
                  <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
                     {filter === "all"
                        ? "Applications submitted to campaigns you manage will appear here."
                        : `There are no ${filter} applications to display.`}
                  </p>
                  <Link
                     href="/dashboard/campaigns"
                     className="mt-5 inline-flex rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-violet-700"
                  >
                     Go to campaigns
                  </Link>
               </div>
            ) : (
               <div className="space-y-4">
                  {visibleItems.map(({ application, campaign }) => {
                     const profile = application.creatorProfileId;
                     const key = `${campaign._id}:${application._id}`;
                     const isPending = application.status === "pending";

                     return (
                        <article
                           key={key}
                           className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
                        >
                           <div className="flex flex-wrap items-start justify-between gap-4">
                              <div className="flex min-w-0 items-start gap-3">
                                 {profile?.avatarUrl ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img
                                       src={profile.avatarUrl}
                                       alt=""
                                       className="h-12 w-12 rounded-full object-cover"
                                    />
                                 ) : (
                                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-violet-100 font-bold text-violet-700">
                                       {(
                                          profile?.displayName ||
                                          profile?.username ||
                                          "C"
                                       )
                                          .charAt(0)
                                          .toUpperCase()}
                                    </div>
                                 )}

                                 <div className="min-w-0">
                                    <h2 className="font-semibold">
                                       {profile?.displayName ||
                                          (profile?.username
                                             ? `@${profile.username}`
                                             : "Creator")}
                                    </h2>
                                    {profile?.username &&
                                       profile?.displayName && (
                                          <p className="text-sm text-slate-500">
                                             @{profile.username}
                                          </p>
                                       )}
                                    {profile?.country && (
                                       <p className="mt-1 text-xs text-slate-500">
                                          {profile.country}
                                       </p>
                                    )}
                                 </div>
                              </div>

                              <span
                                 className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${
                                    application.status === "accepted"
                                       ? "bg-emerald-100 text-emerald-700"
                                       : application.status === "rejected"
                                         ? "bg-red-100 text-red-700"
                                         : application.status === "pending"
                                           ? "bg-amber-100 text-amber-800"
                                           : "bg-slate-100 text-slate-600"
                                 }`}
                              >
                                 {application.status}
                              </span>
                           </div>

                           <div className="mt-5 rounded-xl bg-slate-50 p-4">
                              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                                 Applied to campaign
                              </p>
                              <Link
                                 href={`/dashboard/campaigns/${campaign._id}`}
                                 className="mt-1 inline-block font-semibold text-violet-700 hover:underline"
                              >
                                 {campaign.title}
                              </Link>

                              {typeof application.proposedRate === "number" && (
                                 <p className="mt-2 text-sm text-slate-600">
                                    Proposed rate:{" "}
                                    <span className="font-semibold">
                                       {application.proposedRate.toLocaleString()}
                                    </span>
                                 </p>
                              )}

                              {application.message && (
                                 <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-600">
                                    {application.message}
                                 </p>
                              )}

                              {profile?.niches && profile.niches.length > 0 && (
                                 <div className="mt-3 flex flex-wrap gap-2">
                                    {profile.niches.map((niche) => (
                                       <span
                                          key={niche}
                                          className="rounded-full bg-white px-3 py-1 text-xs text-slate-600 ring-1 ring-slate-200"
                                       >
                                          {niche}
                                       </span>
                                    ))}
                                 </div>
                              )}
                           </div>

                           {isPending && (
                              <div className="mt-4 flex flex-wrap justify-end gap-3">
                                 <button
                                    disabled={updating === key}
                                    onClick={() =>
                                       void updateApplication(
                                          campaign._id,
                                          application._id,
                                          "rejected",
                                       )
                                    }
                                    className="rounded-xl border border-red-200 px-4 py-2.5 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"
                                 >
                                    {updating === key ? "Updating…" : "Reject"}
                                 </button>
                                 <button
                                    disabled={updating === key}
                                    onClick={() =>
                                       void updateApplication(
                                          campaign._id,
                                          application._id,
                                          "accepted",
                                       )
                                    }
                                    className="rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-50"
                                 >
                                    {updating === key
                                       ? "Updating…"
                                       : "Accept creator"}
                                 </button>
                              </div>
                           )}
                        </article>
                     );
                  })}
               </div>
            )}
         </div>
      </main>
   );
}
