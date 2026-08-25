"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, Copy, MapPin, Plus, Search, Share2 } from "lucide-react";

type Gym = { id: string; name: string; address: string; coverPhotoUrl: string | null; isPublished: boolean; isVerified: boolean; isClaimed: boolean; claims: { id: string }[] };
type Claim = { id: string; businessRole: string | null; evidence: string | null; gym: Gym; claimant: { name: string | null; username: string | null; email: string | null } };

export default function AdminGymManager() {
    const [gyms, setGyms] = useState<Gym[]>([]);
    const [claims, setClaims] = useState<Claim[]>([]);
    const [query, setQuery] = useState("");
    const [message, setMessage] = useState("");

    const load = useCallback(async () => {
        const [gymResponse, claimResponse] = await Promise.all([
            fetch(`/api/admin/gyms?q=${encodeURIComponent(query)}`, { cache: "no-store" }),
            fetch("/api/admin/gym-claims", { cache: "no-store" }),
        ]);
        if (gymResponse.ok) setGyms((await gymResponse.json()).gyms);
        if (claimResponse.ok) setClaims((await claimResponse.json()).claims);
    }, [query]);

    useEffect(() => { const timer = window.setTimeout(() => void load(), 200); return () => window.clearTimeout(timer); }, [load]);

    async function reviewClaim(id: string, status: "APPROVED" | "REJECTED") {
        const response = await fetch(`/api/admin/gym-claims/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
        const result = await response.json().catch(() => ({}));
        setMessage(response.ok ? `Claim ${status.toLowerCase()}.` : result.message ?? "Unable to review claim.");
        if (response.ok) await load();
    }

    async function shareGym(gym: Gym) {
        setMessage("");
        const response = await fetch(`/api/admin/gyms/${gym.id}/invite`, { method: "POST" });
        const result = await response.json().catch(() => ({}));
        if (!response.ok) { setMessage(result.message ?? "Unable to create a share link."); return; }
        try {
            await navigator.clipboard.writeText(result.url);
            setMessage(`Verification link for ${gym.name} copied to your clipboard. It expires in 14 days.`);
        } catch {
            window.prompt("Copy this gym verification link:", result.url);
            setMessage(`Verification link created for ${gym.name}. It expires in 14 days.`);
        }
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
                    <div className="p-4"><div className="min-w-0"><div className="flex items-center gap-1.5"><p className="truncate font-semibold">{gym.name}</p>{gym.isVerified && <CheckCircle2 size={15} className="shrink-0 text-[#22c55e]" />}</div><p className="mt-1 flex items-start gap-1 text-xs text-zinc-500"><MapPin size={13} className="shrink-0" />{gym.address}</p></div><div className="mt-4 flex gap-2 text-[10px] font-semibold uppercase tracking-wide"><span className="rounded-full bg-zinc-100 px-2 py-1 dark:bg-white/10">{gym.isClaimed ? "Claimed" : "Unclaimed"}</span><span className="rounded-full bg-zinc-100 px-2 py-1 dark:bg-white/10">{gym.isPublished ? "Published" : "Draft"}</span></div></div></Link>
                    <div className="border-t border-black/5 p-3 dark:border-white/10"><button type="button" onClick={() => void shareGym(gym)} className="flex w-full items-center justify-center gap-2 rounded-xl border border-[#22c55e] px-3 py-2 text-sm font-semibold text-[#22c55e] transition hover:bg-[#22c55e]/10"><Share2 size={15}/><Copy size={14}/>Copy verification link</button></div>
                </article>)}
                {gyms.length === 0 && <p className="text-sm text-zinc-500">No gym listings found.</p>}
            </div>
        </section>
        <section><h2 className="text-xl font-semibold">Claims awaiting review</h2><div className="mt-3 space-y-3">{claims.length === 0 && <p className="text-sm text-zinc-500">No pending claims.</p>}{claims.map((claim) => <article key={claim.id} className="rounded-xl border border-black/10 bg-white p-4 dark:border-white/10 dark:bg-white/5"><p className="font-medium">{claim.gym.name}</p><p className="text-sm text-zinc-500">{claim.claimant.name || claim.claimant.username || claim.claimant.email} · {claim.businessRole || "Role not provided"}</p>{claim.evidence && <p className="mt-2 text-sm">{claim.evidence}</p>}<div className="mt-3 flex gap-2"><button onClick={() => reviewClaim(claim.id, "APPROVED")} className="rounded-lg bg-[#22c55e] px-3 py-2 text-sm font-bold text-black transition hover:bg-[#19a94e]">Approve and verify</button><button onClick={() => reviewClaim(claim.id, "REJECTED")} className="rounded-lg border px-3 py-2 text-sm transition hover:border-[#22c55e] hover:text-[#22c55e]">Reject</button></div></article>)}</div></section>
    </div>;
}
