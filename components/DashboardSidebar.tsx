"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const navigation = [
   {
      title: "WORKSPACE",
      items: [
         { label: "Overview", href: "/dashboard", icon: "◫" },
         { label: "Campaigns", href: "/dashboard/campaigns", icon: "▤" },
         { label: "Creator marketplace", href: "/marketplace", icon: "◇" },
         { label: "Applications", href: "/dashboard/applications", icon: "☷" },
      ],
   },
   {
      title: "MANAGEMENT",
      items: [
         {
            label: "Organizations",
            href: "/dashboard/organizations",
            icon: "▦",
         },
         { label: "Analytics", href: "/dashboard/analytics", icon: "⌁" },
      ],
   },
   {
      title: "PREFERENCES",
      items: [{ label: "Settings", href: "/dashboard/settings", icon: "⚙" }],
   },
];

function isActive(pathname: string, href: string) {
   if (href === "/dashboard") {
      return pathname === href;
   }

   return pathname === href || pathname.startsWith(`${href}/`);
}

export default function DashboardSidebar() {
   const pathname = usePathname();
   const [mobileOpen, setMobileOpen] = useState(false);

   function SidebarContents() {
      return (
         <>
            <Link
               href="/dashboard"
               onClick={() => setMobileOpen(false)}
               className="flex h-[76px] items-center gap-3 border-b border-white/[0.08] px-6"
            >
               <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-500 text-lg font-black text-white shadow-lg shadow-violet-500/20">
                  A
               </span>
               <span className="text-xl font-black tracking-tight">
                  AD<span className="text-violet-400">FLOW</span>
               </span>
            </Link>

            <div className="border-b border-white/[0.08] p-4">
               <div className="rounded-xl border border-white/[0.07] bg-white/[0.035] px-3 py-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-gray-500">
                     Current workspace
                  </p>
                  <p className="mt-1 truncate text-sm font-semibold text-gray-200">
                     My organization
                  </p>
                  <p className="mt-1 text-xs text-gray-500">
                     Advertising workspace
                  </p>
               </div>
            </div>

            <nav className="flex-1 space-y-7 overflow-y-auto px-3 py-6">
               {navigation.map((group) => (
                  <div key={group.title}>
                     <p className="mb-3 px-3 text-[10px] font-bold tracking-[0.2em] text-gray-500">
                        {group.title}
                     </p>

                     <div className="space-y-1">
                        {group.items.map((item) => {
                           const active = isActive(pathname, item.href);

                           return (
                              <Link
                                 key={item.href}
                                 href={item.href}
                                 onClick={() => setMobileOpen(false)}
                                 className={`group flex items-center gap-3 rounded-xl px-3 py-3 text-[13px] font-medium transition ${
                                    active
                                       ? "border border-violet-400/15 bg-violet-500/10 text-violet-300"
                                       : "border border-transparent text-gray-400 hover:bg-white/[0.045] hover:text-white"
                                 }`}
                              >
                                 <span
                                    className={`flex h-5 w-5 items-center justify-center text-lg ${
                                       active
                                          ? "text-violet-300"
                                          : "text-gray-500 group-hover:text-gray-300"
                                    }`}
                                    aria-hidden="true"
                                 >
                                    {item.icon}
                                 </span>
                                 <span className="flex-1">{item.label}</span>
                                 {active && (
                                    <span className="h-1.5 w-1.5 rounded-full bg-violet-400" />
                                 )}
                              </Link>
                           );
                        })}
                     </div>
                  </div>
               ))}
            </nav>

            <div className="border-t border-white/[0.08] p-4">
               <Link
                  href="/dashboard/organizations/new"
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center justify-center gap-2 rounded-xl bg-violet-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-violet-400"
               >
                  <span aria-hidden="true">+</span>
                  Create organization
               </Link>
               <p className="mt-4 text-center text-[10px] text-gray-600">
                  ADFLOW · Creator partnerships
               </p>
            </div>
         </>
      );
   }

   return (
      <>
         <aside className="sticky top-0 hidden h-screen w-[250px] shrink-0 flex-col border-r border-white/[0.08] bg-[#0b0e16] lg:flex">
            <SidebarContents />
         </aside>

         <div className="fixed left-4 top-[88px] z-40 lg:hidden">
            <button
               type="button"
               onClick={() => setMobileOpen(true)}
               aria-label="Open navigation menu"
               aria-expanded={mobileOpen}
               className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-[#151925] text-lg text-white shadow-lg"
            >
               ☰
            </button>
         </div>

         {mobileOpen && (
            <div className="fixed inset-0 z-[60] lg:hidden">
               <button
                  type="button"
                  aria-label="Close navigation menu"
                  onClick={() => setMobileOpen(false)}
                  className="absolute inset-0 bg-black/70"
               />
               <aside className="absolute inset-y-0 left-0 flex w-[280px] max-w-[85vw] flex-col border-r border-white/10 bg-[#0b0e16] shadow-2xl">
                  <div className="flex items-center justify-end border-b border-white/[0.08] px-4 py-3">
                     <button
                        type="button"
                        onClick={() => setMobileOpen(false)}
                        aria-label="Close menu"
                        className="rounded-lg px-3 py-2 text-gray-400 hover:bg-white/5 hover:text-white"
                     >
                        ✕
                     </button>
                  </div>
                  <SidebarContents />
               </aside>
            </div>
         )}
      </>
   );
}
