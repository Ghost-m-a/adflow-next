"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import CampaignCard, {
   type CampaignCardData,
} from "@/components/campaigns/CampaignCard";

type Campaign = CampaignCardData & { organizationId: string };

export default function CampaignsPage() {
   const router = useRouter();
   const [campaigns, setCampaigns] = useState<Campaign[]>([]);
   const [loading, setLoading] = useState(true);
   const [error, setError] = useState("");
   const [filter, setFilter] = useState("all");
   const [search, setSearch] = useState("");

   const load = useCallback(async () => {
      setLoading(true);
      setError("");

      try {
         const response = await fetch("/api/campaigns", {
            cache: "no-store",
         });
         const data = await response.json();

         if (response.status === 401) {
            router.replace("/login");
            return;
         }

         if (!response.ok) {
            throw new Error(data.error || "Unable to load campaigns.");
         }

         setCampaigns(data.campaigns || []);
      } catch (err) {
         setError(
            err instanceof Error ? err.message : "Unable to load campaigns.",
         );
      } finally {
         setLoading(false);
      }
   }, [router]);

   useEffect(() => {
      void load();
   }, [load]);

   const filtered = useMemo(() => {
      const query = search.trim().toLowerCase();

      return campaigns.filter((campaign) => {
         const statusMatches = filter === "all" || campaign.status === filter;

         const searchMatches =
            !query ||
            campaign.title.toLowerCase().includes(query) ||
            (campaign.organization?.name || "").toLowerCase().includes(query);

         return statusMatches && searchMatches;
      });
   }, [campaigns, filter, search]);

   return (
      <>
         <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
               <p className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-400">
                  Workspace
               </p>
               <h1 className="mt-2 text-3xl font-bold">Campaigns</h1>
               <p className="mt-2 text-sm text-gray-400">
                  Search, filter, and manage your campaigns.
               </p>
            </div>

            <Link
               href="/dashboard"
               className="rounded-xl bg-violet-500 px-5 py-3 text-center text-sm font-semibold hover:bg-violet-400"
            >
               + Create campaign
            </Link>
         </div>

         <div className="mt-7 grid gap-3 sm:grid-cols-[1fr_190px]">
            <input
               value={search}
               onChange={(event) => setSearch(event.target.value)}
               placeholder="Search campaigns or organizations..."
               className="rounded-xl border border-white/10 bg-white/[0.035] px-4 py-3 text-sm outline-none focus:border-violet-400/50"
            />

            <select
               value={filter}
               onChange={(event) => setFilter(event.target.value)}
               className="rounded-xl border border-white/10 bg-[#0b1020] px-4 py-3 text-sm"
            >
               <option value="all">All statuses</option>
               <option value="draft">Draft</option>
               <option value="active">Active</option>
               <option value="paused">Paused</option>
               <option value="completed">Completed</option>
               <option value="cancelled">Cancelled</option>
            </select>
         </div>

         {error && (
            <div
               role="alert"
               className="mt-5 rounded-xl border border-red-400/20 bg-red-400/10 p-4 text-sm text-red-200"
            >
               {error}
               <button onClick={() => void load()} className="ml-3 underline">
                  Retry
               </button>
            </div>
         )}

         {loading ? (
            <p className="mt-8 text-sm text-gray-400">Loading campaigns...</p>
         ) : filtered.length ? (
            <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
               {filtered.map((campaign) => (
                  <CampaignCard key={campaign._id} campaign={campaign} />
               ))}
            </div>
         ) : (
            <div className="mt-6 rounded-2xl border border-dashed border-white/15 p-10 text-center">
               <h2 className="font-semibold">
                  {campaigns.length
                     ? "No matching campaigns"
                     : "No campaigns yet"}
               </h2>
               <p className="mt-2 text-sm text-gray-400">
                  {campaigns.length
                     ? "Try another search or status filter."
                     : "Create your first campaign to start working with creators."}
               </p>
               {!campaigns.length && (
                  <Link
                     href="/dashboard"
                     className="mt-5 inline-flex rounded-xl bg-violet-500 px-5 py-3 text-sm font-semibold"
                  >
                     Create campaign
                  </Link>
               )}
            </div>
         )}
      </>
   );
}
