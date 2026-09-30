"use client";

import { useMemo, useState } from "react";
import AdminFinancialGrowth, { type FinancialTrendPoint, type GymFinancialTrend } from "@/components/AdminFinancialGrowth";

type RevenueRow = { name: string; total: number; dayPass: number; membership: number; payments: number; customers: number; mrr: number };
type OfferRow = { gym: string; type: "Day pass" | "Membership"; offer: string; revenue: number; payments: number };
const PAGE_SIZE = 5;
const money = (value: number) => value.toLocaleString("en-US", { style: "currency", currency: "USD" });

function Pager({ page, pages, setPage }: { page: number; pages: number; setPage: (page: number) => void }) {
  if (pages <= 1) return null;
  return <div className="mt-3 flex items-center justify-end gap-3 text-sm"><button type="button" disabled={page===1} onClick={()=>setPage(Math.max(1,page-1))} className="rounded-full border border-black/10 px-4 py-2 font-bold disabled:opacity-35 dark:border-white/15">Previous</button><span className="text-zinc-500">Page {page} of {pages}</span><button type="button" disabled={page===pages} onClick={()=>setPage(Math.min(pages,page+1))} className="rounded-full border border-black/10 px-4 py-2 font-bold disabled:opacity-35 dark:border-white/15">Next</button></div>;
}

function RevenueTable({ title, firstHeader, rows, showCustomers = false, userSpending = false }: { title: string; firstHeader: string; rows: RevenueRow[]; showCustomers?: boolean; userSpending?: boolean }) {
  const [page,setPage]=useState(1),sorted=useMemo(()=>[...rows].sort((a,b)=>b.total-a.total||a.name.localeCompare(b.name)),[rows]),pages=Math.max(1,Math.ceil(sorted.length/PAGE_SIZE)),visible=sorted.slice((page-1)*PAGE_SIZE,page*PAGE_SIZE);
  return <section><h3 className="mb-3 font-black">{title}</h3><div className="overflow-x-auto rounded-2xl border border-black/10 dark:border-white/10"><table className="w-full min-w-[760px] text-left text-sm"><thead className="bg-black/[.025] text-xs uppercase tracking-wide text-zinc-500 dark:bg-white/[.025]"><tr><th className="p-3">{firstHeader}</th>{showCustomers&&<th>Customers supplied</th>}{showCustomers&&<th>MRR</th>}<th>{userSpending?"Total spent":"Total revenue"}</th><th>{userSpending?"Day-pass spending":"Day-pass revenue"}</th><th>{userSpending?"Membership spending":"Membership revenue"}</th><th>{userSpending?"Confirmed payments":"Paid charges"}</th><th className="pr-3">{userSpending?"Average payment":"Average charge"}</th></tr></thead><tbody>{visible.map(row=><tr key={row.name} className="border-t border-black/10 dark:border-white/10"><td className="p-3 font-semibold">{row.name}</td>{showCustomers&&<td>{row.customers.toLocaleString()}</td>}{showCustomers&&<td>{money(row.mrr)}</td>}<td>{money(row.total)}</td><td>{money(row.dayPass)}</td><td>{money(row.membership)}</td><td>{row.payments.toLocaleString()}</td><td className="pr-3">{money(row.payments?row.total/row.payments:0)}</td></tr>)}{!visible.length&&<tr><td colSpan={showCustomers?8:6} className="p-6 text-center text-zinc-500">{userSpending?"No gym-confirmed user spending for this period.":"No gym-confirmed revenue for this period."}</td></tr>}</tbody></table></div><Pager page={page} pages={pages} setPage={setPage}/></section>;
}

export default function AdminFinancialMetrics({ total, dayPass, membership, totalMrr, payments, listedGyms, gymRows, userRows, offerRows, trend, gymTrends }: { total:number; dayPass:number; membership:number; totalMrr:number; payments:number; listedGyms:number; gymRows:RevenueRow[]; userRows:RevenueRow[]; offerRows:OfferRow[]; trend:FinancialTrendPoint[]; gymTrends:GymFinancialTrend[] }) {
  const [offerPage,setOfferPage]=useState(1),sortedOffers=useMemo(()=>[...offerRows].sort((a,b)=>b.revenue-a.revenue||a.offer.localeCompare(b.offer)),[offerRows]),offerPages=Math.max(1,Math.ceil(sortedOffers.length/PAGE_SIZE)),visibleOffers=sortedOffers.slice((offerPage-1)*PAGE_SIZE,offerPage*PAGE_SIZE),revenueGyms=gymRows.filter(row=>row.total>0).length;
  const gymRevenueValues=gymRows.filter(row=>row.total>0).map(row=>row.total).sort((a,b)=>a-b),middle=Math.floor(gymRevenueValues.length/2),medianGymRevenue=gymRevenueValues.length?(gymRevenueValues.length%2?gymRevenueValues[middle]:(gymRevenueValues[middle-1]+gymRevenueValues[middle])/2):0;
  const summary=[
    ["Total attributed revenue",money(total)],
    ["Day-pass attributed revenue",money(dayPass)],
    ["Membership attributed revenue",money(membership)],
    ["Total MRR",money(totalMrr)],
    ["Revenue-generating gyms",`${revenueGyms.toLocaleString()} / ${listedGyms.toLocaleString()}`],
    ["Average / median revenue per revenue-generating gym",`${money(revenueGyms?total/revenueGyms:0)} / ${money(medianGymRevenue)}`],
  ];
  return <section id="financial-metrics" className="space-y-6 border-t border-black/10 pt-8 dark:border-white/10"><h2 className="text-xl font-black">Financial Metrics</h2><div className="overflow-hidden rounded-2xl border border-black/10 dark:border-white/10"><table className="w-full text-sm"><tbody>{summary.map(([label,value])=><tr key={label} className="border-t border-black/10 first:border-0 dark:border-white/10"><th className="p-3 text-left font-semibold">{label}</th><td className="p-3 text-right font-black">{value}</td></tr>)}</tbody></table></div><AdminFinancialGrowth overall={trend} gyms={gymTrends}/><RevenueTable title="Revenue by gym" firstHeader="Gym" rows={gymRows} showCustomers/><RevenueTable title={`User spending (${userRows.length.toLocaleString()} paying users)`} firstHeader="User" rows={userRows} userSpending/><section><h3 className="mb-3 font-black">Revenue by offer</h3><div className="overflow-x-auto rounded-2xl border border-black/10 dark:border-white/10"><table className="w-full min-w-[680px] text-left text-sm"><thead className="bg-black/[.025] text-xs uppercase tracking-wide text-zinc-500 dark:bg-white/[.025]"><tr><th className="p-3">Gym</th><th>Type</th><th>Offer</th><th>Paid charges</th><th className="pr-3">Revenue</th></tr></thead><tbody>{visibleOffers.map(row=><tr key={`${row.gym}:${row.type}:${row.offer}`} className="border-t border-black/10 dark:border-white/10"><td className="p-3 font-semibold">{row.gym}</td><td>{row.type}</td><td>{row.offer}</td><td>{row.payments.toLocaleString()}</td><td className="pr-3">{money(row.revenue)}</td></tr>)}{!visibleOffers.length&&<tr><td colSpan={5} className="p-6 text-center text-zinc-500">No gym-confirmed offer revenue for this period.</td></tr>}</tbody></table></div><Pager page={offerPage} pages={offerPages} setPage={setOfferPage}/></section></section>;
}
