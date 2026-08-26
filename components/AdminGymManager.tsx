"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { Check, CheckCircle2, Copy, MapPin, Plus, Search, Share2 } from "lucide-react";

type Gym = { id: string; name: string; address: string; coverPhotoUrl: string | null; isPublished: boolean; isVerified: boolean; isClaimed: boolean; awaitingApproval: boolean; claims: { id: string }[] };
export default function AdminGymManager() {
    const [gyms, setGyms] = useState<Gym[]>([]);
    const [query, setQuery] = useState("");
    const [message, setMessage] = useState("");
    const [copiedGymId, setCopiedGymId] = useState<string | null>(null);
    const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    const load = useCallback(async () => {
        const gymResponse = await fetch(`/api/admin/gyms?q=${encodeURIComponent(query)}`, { cache: "no-store" });
        if (gymResponse.ok) setGyms((await gymResponse.json()).gyms);
    }, [query]);

    useEffect(() => { const timer = window.setTimeout(() => void load(), 200); return () => window.clearTimeout(timer); }, [load]);
    useEffect(() => () => { if (copyTimer.current) clearTimeout(copyTimer.current); }, []);

    async function shareGym(gym: Gym) {
        setMessage("");
        const response = await fetch(`/api/admin/gyms/${gym.id}/invite`, { method: "POST" });
        const result = await response.json().catch(() => ({}));
        if (!response.ok) { setMessage(result.message ?? "Unable to create a share link."); return; }
        try {
            await navigator.clipboard.writeText(result.url);
        } catch {
            window.prompt("Copy this gym verification link:", result.url);
        }
        setCopiedGymId(gym.id);
        if (copyTimer.current) clearTimeout(copyTimer.current);
        copyTimer.current = setTimeout(() => { setCopiedGymId((current) => current === gym.id ? null : current); copyTimer.current = null; }, 2000);
    }

    return <div className="space-y-10">
        {message && <p className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">{message}</p>}
        <section>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div><h2 className="text-2xl font-semibold">Gym listings</h2><p className="mt-1 text-sm text-zinc-500">Open any listing to view or update all of its public information.</p></div>
                <Link href="/admin/gyms/new" className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#22c55e] px-4 py-2.5 text-sm font-bold text-black transition hover:bg-[#19a94e]"><Plus size={17} />Add new gym listing</Link>
            </div>
            <label className="mt-5 flex max-w-xl items-center gap-2 rounded-xl border border-black/10 bg-white px-3 dark:border-white/10 dark:bg-white/5"><Search size={17} className="text-zinc-400" /><input value={query} onChange={(event) => setQuery(event.target.value)} className="w-full bg-transparent py-3 text-sm outline-none" placeholder="Search current listings by name or address" /></label>
            <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {gyms.map((gym) => <article key={gym.id} className="group overflow-hidden rounded-2xl border border-black/10 bg-white transition hover:-translate-y-0.5 hover:shadow-md dark:border-white/10 dark:bg-white/5">
                    <Link href={`/admin/gyms/${gym.id}`} className="block"><div className="relative h-28 bg-zinc-100 dark:bg-white/10">{gym.coverPhotoUrl && <img src={gym.coverPhotoUrl} alt="" className="h-full w-full object-cover" />}</div>
                    <div className="p-4"><div className="min-w-0"><div className="flex items-center gap-1.5"><p className="truncate font-semibold">{gym.name}</p>{gym.isVerified && <CheckCircle2 size={15} className="shrink-0 text-[#22c55e]" />}</div><p className="mt-1 flex items-start gap-1 text-xs text-zinc-500"><MapPin size={13} className="shrink-0" />{gym.address}</p></div><div className="mt-4 flex flex-wrap items-center gap-2 text-[10px] font-semibold uppercase tracking-wide"><span className={`rounded-full border px-2 py-1 ${gym.isClaimed?"border-[#22c55e]/40 bg-[#22c55e]/10 text-[#16803d] dark:text-[#86efac]":"border-zinc-200 bg-zinc-100 text-zinc-600 dark:border-white/10 dark:bg-white/10 dark:text-white/60"}`}>{gym.isClaimed?"Claimed":"Unclaimed"}</span><span className={`rounded-full border px-2 py-1 ${gym.isVerified?"border-[#22c55e]/40 bg-[#22c55e]/10 text-[#16803d] dark:text-[#86efac]":"border-zinc-200 bg-zinc-100 text-zinc-600 dark:border-white/10 dark:bg-white/10 dark:text-white/60"}`}>{gym.isVerified?"Verified":"Unverified"}</span>{gym.awaitingApproval&&<span className="normal-case tracking-normal text-amber-700 dark:text-amber-300">Awaiting admin approval</span>}</div></div></Link>
                    <div className="border-t border-black/5 p-3 dark:border-white/10"><button type="button" onClick={() => void shareGym(gym)} className={`flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl border border-[#22c55e] px-3 py-2 text-sm font-semibold transition-all duration-300 ${copiedGymId===gym.id?"scale-[1.02] bg-[#22c55e] text-black":"text-[#22c55e] hover:bg-[#22c55e]/10"}`}>{copiedGymId===gym.id?<span className="flex animate-[copy-confirm_.35s_ease-out] items-center gap-2"><Check size={16} strokeWidth={3}/>Copied!</span>:<span className="flex items-center gap-2"><Share2 size={15}/><Copy size={14}/>Copy verification link</span>}</button></div>
                </article>)}
                {gyms.length === 0 && <p className="text-sm text-zinc-500">No gym listings found.</p>}
            </div>
        </section>
    </div>;
}
