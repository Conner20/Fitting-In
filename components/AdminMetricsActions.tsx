"use client";

import { Download, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export default function AdminMetricsActions() {
  const [confirming, setConfirming] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [error, setError] = useState("");
  const timeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (timeout.current) clearTimeout(timeout.current); }, []);

  const clearMetrics = async () => {
    if (!confirming) {
      setError("");
      setConfirming(true);
      timeout.current = setTimeout(() => setConfirming(false), 4000);
      return;
    }

    if (timeout.current) clearTimeout(timeout.current);
    setClearing(true);
    setError("");
    const response = await fetch("/api/admin/metrics", { method: "DELETE" });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      setClearing(false);
      setConfirming(false);
      setError(result.error ?? "Metrics could not be cleared.");
      return;
    }
    window.location.reload();
  };

  return <div className="flex flex-col items-center gap-2">
    <div className="flex flex-nowrap items-center justify-center gap-2 sm:gap-3">
      <a href="/api/admin/metrics/export" download className="inline-flex h-10 shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-full border border-[#22c55e] bg-[#22c55e] px-3 text-xs font-black text-black transition hover:bg-[#050505] hover:text-[#22c55e] sm:gap-2 sm:px-5 sm:text-sm"><Download className="h-4 w-4 shrink-0"/>Export metrics CSV</a>
      <button type="button" onClick={clearMetrics} disabled={clearing} className="inline-flex h-10 min-w-0 shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-full border border-red-400 bg-red-400 px-3 text-xs font-black text-black transition hover:bg-[#050505] hover:text-red-400 disabled:cursor-wait disabled:opacity-70 sm:min-w-36 sm:gap-2 sm:px-5 sm:text-sm">
        <Trash2 className="h-4 w-4"/>{clearing ? "Clearing…" : confirming ? "Are you sure?" : "Clear metrics"}
      </button>
    </div>
    {error && <p role="alert" className="text-sm font-semibold text-red-400">{error}</p>}
  </div>;
}
