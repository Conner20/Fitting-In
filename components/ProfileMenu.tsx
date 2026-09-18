"use client";

import Link from "next/link";
import { signOut } from "next-auth/react";
import { KeyRound, LogOut, Trash2, UserRound, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

export default function ProfileMenu({ className = "", labeled = false }: { className?: string; labeled?: boolean }) {
  const [open, setOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const [position, setPosition] = useState({ top: 0, right: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);

  const toggleMenu = () => {
    if (open) {
      setOpen(false);
      return;
    }
    const rect = buttonRef.current?.getBoundingClientRect();
    if (rect) {
      setPosition({ top: rect.bottom + 8, right: Math.max(12, window.innerWidth - rect.right) });
    }
    setOpen(true);
  };

  useEffect(() => {
    if (!open) return;
    const place = () => {
      const rect = buttonRef.current?.getBoundingClientRect();
      if (rect) setPosition({ top: rect.bottom + 8, right: Math.max(12, window.innerWidth - rect.right) });
    };
    place();
    const close = (event: PointerEvent) => {
      const target = event.target as HTMLElement;
      if (!buttonRef.current?.contains(target) && !target.closest("[data-profile-menu]")) setOpen(false);
    };
    const escape = (event: KeyboardEvent) => event.key === "Escape" && setOpen(false);
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", escape);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", escape);
    };
  }, [open]);

  const deleteAccount = async () => {
    setDeleting(true);
    setError("");
    const response = await fetch("/api/user/delete", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      setDeleting(false);
      setError(result.message || "Unable to delete your account right now.");
      return;
    }
    await signOut({ callbackUrl: "/" });
  };

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        aria-label="Open profile menu"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={toggleMenu}
        className={labeled
          ? `profile-menu-trigger filter-pill landing-toolbar-button shrink-0 ${className}`
          : `profile-menu-trigger flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-black/10 text-zinc-700 transition hover:border-[#22c55e] hover:text-[#22c55e] dark:border-white/15 dark:text-white ${className}`}
      >
        <UserRound className="h-5 w-5" />
        {labeled && <span className="landing-action-label landing-profile-label">Profile</span>}
      </button>

      {open && typeof document !== "undefined" && createPortal(
        <div
          data-profile-menu
          role="menu"
          style={{ top: position.top, right: position.right }}
          className="fixed z-[7000] w-52 overflow-hidden rounded-2xl border border-white/10 bg-[#111411] p-1.5 text-white shadow-2xl shadow-black/50"
        >
          <button type="button" role="menuitem" onClick={() => signOut({ callbackUrl: "/" })} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold transition hover:bg-white/10">
            <LogOut className="h-4 w-4" />Log out
          </button>
          <Link href="/change-password" role="menuitem" className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition hover:bg-white/10">
            <KeyRound className="h-4 w-4" />Change password
          </Link>
          <button type="button" role="menuitem" onClick={() => { setOpen(false); setError(""); setConfirmDelete(true) }} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-red-300 transition hover:bg-red-500/10 hover:text-red-200">
            <Trash2 className="h-4 w-4" />Delete account
          </button>
        </div>,
        document.body,
      )}

      {confirmDelete && typeof document !== "undefined" && createPortal(
        <div className="fixed inset-0 z-[8000] flex items-center justify-center bg-black/75 p-4" onMouseDown={event => { if (event.target === event.currentTarget && !deleting) setConfirmDelete(false) }}>
          <div role="dialog" aria-modal="true" aria-labelledby="delete-account-title" className="relative w-full max-w-sm rounded-3xl border border-white/10 bg-[#111411] p-6 text-center text-white shadow-2xl">
            <button type="button" aria-label="Close" disabled={deleting} onClick={() => setConfirmDelete(false)} className="absolute right-4 top-4 grid h-9 w-9 place-items-center rounded-full border border-white/15 text-white transition hover:border-white disabled:opacity-40"><X className="h-4 w-4" /></button>
            <Trash2 className="mx-auto h-9 w-9 text-red-300" />
            <h2 id="delete-account-title" className="mt-4 text-2xl font-black">Delete your account?</h2>
            <p className="mt-3 text-sm leading-6 text-white/60">Are you sure you want to permanently delete your account?</p>
            {error && <p className="mt-4 rounded-xl border border-red-400/30 bg-red-950/45 p-3 text-sm text-red-100">{error}</p>}
            <div className="mt-6 grid grid-cols-2 gap-3">
              <button type="button" disabled={deleting} onClick={() => void deleteAccount()} className="rounded-full border border-red-400 bg-red-400 px-5 py-3 text-sm font-black text-[#111411] transition hover:bg-[#111411] hover:text-red-300 disabled:opacity-60">{deleting ? "Deleting…" : "Yes"}</button>
              <button type="button" disabled={deleting} onClick={() => setConfirmDelete(false)} className="rounded-full border border-white/20 px-5 py-3 text-sm font-black text-white transition hover:border-white disabled:opacity-60">No</button>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
