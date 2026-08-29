"use client";

import { signOut } from "next-auth/react";
import { Trash2, UserRound, X } from "lucide-react";
import { FormEvent, useState } from "react";

export default function LandingAccountControls({ signedIn, email }: { signedIn: boolean; email?: string | null }) {
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  // The landing header already contains these actions at every viewport size.
  // Avoid a second floating copy covering the search controls on phones.
  if (!signedIn) return null;

  async function removeAccount(event: FormEvent) {
    event.preventDefault(); setDeleting(true); setError("");
    const response = await fetch("/api/user/delete", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password }) });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) { setError(result.message || "Unable to delete your account."); setDeleting(false); return; }
    await signOut({ callbackUrl: "/" });
  }

  return <>
    <div className="fixed right-3 top-3 z-[1500] hidden items-center gap-1 rounded-full border border-black/10 bg-white/95 p-1 shadow-lg backdrop-blur dark:border-white/10 dark:bg-[#111411]/95 md:flex">
      <span className="hidden max-w-40 truncate px-2 text-xs text-zinc-500 md:block">{email}</span>
      <button onClick={()=>setOpen(true)} aria-label="Delete account" className="rounded-full p-2 text-red-500 hover:bg-red-500/10"><Trash2 className="h-4 w-4"/></button>
    </div>
    {open&&<div className="fixed inset-0 z-[3000] grid place-items-center bg-black/70 p-5" onMouseDown={()=>setOpen(false)}><form onSubmit={removeAccount} onMouseDown={e=>e.stopPropagation()} className="w-full max-w-md rounded-3xl bg-white p-6 text-zinc-900 shadow-2xl dark:bg-[#111411] dark:text-white"><div className="flex justify-between"><UserRound className="h-7 w-7 text-red-500"/><button type="button" onClick={()=>setOpen(false)} className="rounded-full p-2 hover:bg-zinc-100 dark:hover:bg-white/10"><X/></button></div><h2 className="mt-4 text-2xl font-black">Delete your account?</h2><p className="mt-2 text-sm text-zinc-500">This permanently removes your account and saved gyms. Enter your password to confirm.</p><input autoFocus required type="password" value={password} onChange={e=>setPassword(e.target.value)} className="mt-5 w-full rounded-xl border border-zinc-300 bg-transparent px-4 py-3 outline-none focus:border-red-500 dark:border-white/15" placeholder="Password"/>{error&&<p className="mt-2 text-sm font-semibold text-red-500">{error}</p>}<button disabled={deleting} className="mt-5 w-full rounded-full bg-red-600 py-3 font-black text-white hover:bg-red-700 disabled:opacity-50">{deleting?"Deleting…":"Permanently delete account"}</button></form></div>}
  </>;
}
