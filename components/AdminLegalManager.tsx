"use client";

import { FileText, Upload } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import LegalDocumentContent from "@/components/LegalDocumentContent";
import { legalBlocks } from "@/lib/legal-documents";

type Type = "TERMS" | "PRIVACY";
type Version = { id: string; type: Type; title: string; content: unknown; version: number; isCurrent: boolean; originalFileName: string | null; uploadedByEmail: string; createdAt: string; publishedAt: string | null };
type Preview = { type: Type; title: string; content: unknown; originalFileName: string };
const labels: Record<Type, string> = { TERMS: "Terms of Use", PRIVACY: "Privacy Policy" };

export default function AdminLegalManager({ initialVersions }: { initialVersions: Version[] }) {
  const [type, setType] = useState<Type>("TERMS");
  const [versions, setVersions] = useState(initialVersions);
  const [selectedId, setSelectedId] = useState(initialVersions.find(v => v.type === "TERMS")?.id ?? "");
  const [preview, setPreview] = useState<Preview | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const selectedVersion = versions.find(v => v.id === selectedId && v.type === type) ?? versions.find(v => v.type === type);
  const selected = preview ?? selectedVersion;
  const history = useMemo(() => versions.filter(v => v.type === type), [versions, type]);

  const chooseType = (next: Type) => {
    setType(next); setSelectedId(versions.find(v => v.type === next)?.id ?? ""); setPreview(null); setFile(null); setError("");
    if (input.current) input.current.value = "";
  };

  const previewFile = async (selectedFile: File) => {
    if (!selectedFile.name.toLowerCase().endsWith(".docx")) { setFile(null); setPreview(null); setError("Upload a Microsoft Word .docx file."); return; }
    setFile(selectedFile); setPreview(null); setBusy(true); setError("");
    const form = new FormData(); form.set("type", type); form.set("action", "preview"); form.set("file", selectedFile);
    const response = await fetch("/api/admin/legal", { method: "POST", body: form });
    const data = await response.json().catch(() => ({})); setBusy(false);
    if (!response.ok) { setFile(null); return setError(data.error || "Unable to preview this document."); }
    setPreview(data.preview); setSelectedId("");
  };

  const publish = async () => {
    if (!preview || !file) {
      if (!selectedVersion || selectedVersion.isCurrent) return;
      setBusy(true); setError("");
      const response = await fetch("/api/admin/legal", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: selectedVersion.id }) });
      const data = await response.json().catch(() => ({})); setBusy(false);
      if (!response.ok) return setError(data.error || "Unable to publish this version.");
      setVersions(current => current.map(v => v.type === type ? { ...v, isCurrent: v.id === selectedVersion.id, publishedAt: v.id === selectedVersion.id ? data.publishedAt : v.publishedAt } : v));
      return;
    }
    setBusy(true); setError("");
    const form = new FormData(); form.set("type", type); form.set("action", "publish"); form.set("file", file);
    const response = await fetch("/api/admin/legal", { method: "POST", body: form });
    const data = await response.json().catch(() => ({})); setBusy(false);
    if (!response.ok) return setError(data.error || "Unable to publish this document.");
    setVersions(current => [data.version, ...current.map(v => v.type === type ? { ...v, isCurrent: false } : v)]);
    setSelectedId(data.version.id); setPreview(null); setFile(null); if (input.current) input.current.value = "";
  };

  const showingCurrent = !preview && Boolean(selectedVersion?.isCurrent);
  return <div className="space-y-6">
    <div><h1 className="text-2xl font-semibold">Legal pages</h1></div>
    <div className="grid grid-cols-2 gap-1.5 sm:flex sm:gap-2">{(Object.keys(labels) as Type[]).map(key => <button key={key} type="button" onClick={() => chooseType(key)} className={`inline-flex h-9 min-w-0 items-center justify-center truncate rounded-full border px-[.85rem] text-center text-[.78rem] font-bold leading-none transition sm:shrink-0 ${type === key ? "border-[#22c55e] bg-[#22c55e] text-black" : "border-white/15 text-white/70 hover:border-white"}`}>{labels[key]}</button>)}</div>
    <section className="space-y-5">
      <div>
        <div className="rounded-2xl border border-white/10 bg-[#111111] p-5">
          <h2 className="font-black">Upload legal</h2>
          <button type="button" disabled={busy} onClick={() => input.current?.click()} className="mt-4 flex min-h-28 w-full items-center justify-center rounded-xl border border-dashed border-white/20 bg-white/[.03] p-4 text-center text-sm text-white/60 hover:border-[#22c55e] disabled:cursor-wait disabled:opacity-50">
            <span><Upload className={`mx-auto mb-2 h-5 w-5 ${busy ? "animate-pulse" : ""}`} />{busy ? "Formatting preview…" : file?.name ?? "Choose a Microsoft Word .docx file"}</span>
          </button>
          <input ref={input} type="file" className="hidden" accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document" onChange={event => { const selectedFile = event.target.files?.[0]; if (selectedFile) void previewFile(selectedFile); }} />
          {error && <p className="mt-3 rounded-xl border border-red-400/30 bg-red-400/10 p-3 text-sm text-red-300">{error}</p>}
        </div>
      </div>
      <div className="min-w-0 rounded-2xl border border-white/10 bg-[#0a0a0a] p-4 sm:p-6">
        {selected ? <><div className="mb-5 flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-wider text-[#22c55e]">{preview ? "Unpublished preview" : `Published version ${selectedVersion?.version}`}</p><p className="mt-1 text-xs text-white/40">{selected.originalFileName}</p></div><button id="admin-legal-publish" type="button" disabled={busy || showingCurrent} onClick={() => void publish()} className="rounded-full border border-[#22c55e] bg-[#22c55e] px-5 py-2.5 text-sm font-black text-black disabled:cursor-not-allowed disabled:opacity-40">{showingCurrent ? "Published" : busy ? "Publishing…" : "Publish update"}</button></div><div className="rounded-2xl border border-white/10 bg-[#111111]/90 p-5 text-sm leading-7 text-white/70 sm:p-8"><h1 className="mb-7 text-2xl font-semibold tracking-tight text-white sm:text-3xl">{selected.title}</h1><LegalDocumentContent blocks={legalBlocks(selected.content as never)} /></div></> : <div className="grid min-h-72 place-items-center text-center text-white/40"><div><FileText className="mx-auto mb-3"/><p>Choose a document to preview its formatted legal page.</p></div></div>}
      </div>
    </section>
    <section className="rounded-2xl border border-white/10 bg-[#111111] p-5"><h2 className="font-black">Published versions</h2><div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{history.length ? history.map(version => <button type="button" key={version.id} onClick={() => { setPreview(null); setFile(null); setSelectedId(version.id); }} className={`flex w-full items-center justify-between rounded-xl border p-3 text-left text-sm ${!preview && selectedVersion?.id === version.id ? "border-[#22c55e]" : "border-white/10 hover:border-white/30"}`}><span><b>Version {version.version}</b><small className="mt-1 block text-white/45">{new Date(version.publishedAt ?? version.createdAt).toLocaleString()} · {version.uploadedByEmail}</small></span>{version.isCurrent && <span className="rounded-full border border-white/15 px-2 py-1 text-xs font-bold text-white/60">Current</span>}</button>) : <p className="text-sm text-white/45">No published versions yet. The built-in page remains live.</p>}</div></section>
  </div>;
}
