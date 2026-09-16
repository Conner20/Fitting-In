"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

export default function AdminMetricCard({ label, value, breakdown }: { label: string; value: number | string; breakdown?: string }) {
    const [mobileOpen, setMobileOpen] = useState(false);
    const cardRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        if (!mobileOpen) return;
        const closeOnOutsideTap = (event: PointerEvent) => {
            if (!cardRef.current?.contains(event.target as Node)) setMobileOpen(false);
        };
        document.addEventListener("pointerdown", closeOnOutsideTap);
        return () => document.removeEventListener("pointerdown", closeOnOutsideTap);
    }, [mobileOpen]);
    const toggleMobileBreakdown = () => {
        if (!breakdown || !window.matchMedia("(max-width: 767px), (hover: none), (pointer: coarse)").matches) return;
        setMobileOpen((open) => !open);
    };

    return <div
        ref={cardRef}
        tabIndex={breakdown ? 0 : undefined}
        aria-expanded={breakdown ? mobileOpen : undefined}
        onClick={toggleMobileBreakdown}
        className={`group/rate-card relative rounded-2xl border border-black/10 bg-white p-4 dark:border-white/10 dark:bg-white/5 ${breakdown ? "cursor-pointer outline-none focus:border-[#22c55e] md:cursor-help" : ""}`}
    >
        <p className="text-xs font-semibold text-zinc-500">{label}</p>
        <p className="mt-1 text-2xl font-black">{typeof value === "number" ? value.toLocaleString() : value}</p>
        {breakdown && <div role="tooltip" className="pointer-events-none invisible absolute left-1/2 top-full z-[5000] mt-2 hidden w-72 -translate-x-1/2 rounded-xl border border-white/10 bg-[#111411] px-3 py-2 text-xs font-medium leading-5 text-white opacity-0 shadow-2xl transition md:block md:group-hover/rate-card:visible md:group-hover/rate-card:opacity-100 md:group-focus/rate-card:visible md:group-focus/rate-card:opacity-100">{breakdown}</div>}
        {breakdown && mobileOpen && typeof document !== "undefined" && createPortal(<div role="tooltip" className="pointer-events-none fixed inset-x-4 z-[10000] max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-xl border border-white/10 bg-[#111411] px-4 py-3 text-sm font-medium leading-6 text-white shadow-2xl" style={{bottom:"max(1rem, env(safe-area-inset-bottom))"}}>{breakdown}</div>,document.body)}
    </div>;
}
