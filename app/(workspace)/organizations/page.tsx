"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Organization = {
   _id: string;
   name: string;
   slug: string;
   type: string;
   defaultCurrency: string;
   role: string;
};

export default function OrganizationsPage() {
   const router = useRouter();
   const [organizations, setOrganizations] = useState<Organization[]>([]);
   const [loading, setLoading] = useState(true);
   const [error, setError] = useState("");

   const load = useCallback(async () => {
      setLoading(true);
      setError("");

      try {
         const response = await fetch("/api/organizations/mine", {
            cache: "no-store",
         });
         const data = await response.json();

         if (response.status === 401) {
            router.replace("/login");
            return;
         }

         if (!response.ok) {
            throw new Error(data.error || "Unable to load organizations.");
         }

         setOrganizations(data.organizations || []);
      } catch (err) {
         setError(
            err instanceof Error
               ? err.message
               : "Unable to load organizations.",
         );
      } finally {
         setLoading(false);
      }
   }, [router]);

   useEffect(() => {
      void load();
   }, [load]);

   return (
      <>
         <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
               <p className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-400">
                  Management
               </p>
               <h1 className="mt-2 text-3xl font-bold">Organizations</h1>
               <p className="mt-2 text-sm text-gray-400">
                  Workspaces you own or have been invited to.
               </p>
            </div>

            <Link
               href="/dashboard/organizations/new"
               className="rounded-xl bg-violet-500 px-5 py-3 text-center text-sm font-semibold hover:bg-violet-400"
            >
               + Create organization
            </Link>
         </div>

         {error && (
            <div
               role="alert"
               className="mt-6 rounded-xl border border-red-400/20 bg-red-400/10 p-4 text-sm text-red-200"
            >
               {error}
               <button onClick={() => void load()} className="ml-3 underline">
                  Retry
               </button>
            </div>
         )}

         {loading ? (
            <p className="mt-8 text-sm text-gray-400">
               Loading organizations...
            </p>
         ) : organizations.length ? (
            <div className="mt-7 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
               {organizations.map((org) => (
                  <article
                     key={org._id}
                     className="rounded-2xl border border-white/10 bg-white/[0.035] p-5"
                  >
                     <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                           <h2 className="break-words text-lg font-semibold">
                              {org.name}
                           </h2>
                           <p className="mt-1 text-xs capitalize text-gray-500">
                              {org.type} workspace
                           </p>
                        </div>

                        <span className="rounded-full border border-violet-400/20 bg-violet-400/10 px-3 py-1 text-xs capitalize text-violet-200">
                           {org.role}
                        </span>
                     </div>

                     <dl className="mt-5 space-y-3 text-sm">
                        <div className="flex justify-between gap-3">
                           <dt className="text-gray-500">Currency</dt>
                           <dd>{org.defaultCurrency}</dd>
                        </div>
                        <div className="flex justify-between gap-3">
                           <dt className="text-gray-500">Slug</dt>
                           <dd className="max-w-[65%] truncate text-gray-300">
                              {org.slug}
                           </dd>
                        </div>
                     </dl>

                     <p className="mt-5 border-t border-white/10 pt-4 text-xs text-gray-500">
                        Member invitations and role management will be added
                        next.
                     </p>
                  </article>
               ))}
            </div>
         ) : (
            <div className="mt-7 rounded-2xl border border-dashed border-white/15 p-10 text-center">
               <h2 className="font-semibold">No organizations yet</h2>
               <p className="mt-2 text-sm text-gray-400">
                  Create an organization to manage campaigns.
               </p>
               <Link
                  href="/dashboard/organizations/new"
                  className="mt-5 inline-flex rounded-xl bg-violet-500 px-5 py-3 text-sm font-semibold"
               >
                  Create organization
               </Link>
            </div>
         )}
      </>
   );
}
