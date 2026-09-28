"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Minus, Plus, Search, X } from "lucide-react";
import { UniversalCheckboxMark } from "@/components/UniversalCheckbox";

const quantityPattern = /\s*×\s*(\d+)$/;
const itemName = (item: string) => item.replace(quantityPattern, "").trim();
const itemQuantity = (item: string) => Math.max(1, Number(item.match(quantityPattern)?.[1] ?? 1));
const uniqueSorted = (items: string[]) => [...new Map(items.filter(Boolean).map(item => [itemName(item).toLowerCase(), item.trim()])).values()].sort((a, b) => itemName(a).localeCompare(itemName(b)));

export default function FacilityLookup({ label, options, selected, onChange, doneButton = false, dark = false, quantities = false, allowCustom = true }: { label: string; options: string[]; selected: string[]; onChange: (items: string[]) => void; doneButton?: boolean; dark?: boolean; quantities?: boolean; allowCustom?: boolean }) {
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [draft, setDraft] = useState(selected);
  const draftRef = useRef(selected);
  useEffect(() => { if (!open) { draftRef.current = selected; setDraft(selected); } }, [selected, open]);
  useEffect(() => {
    if (!open) return;
    const close = (event: PointerEvent) => {
      const target = event.target as Node;
      if (menu.current?.contains(target) || trigger.current?.contains(target)) return;
      draftRef.current = selected;
      setOpen(false);
      setQuery("");
      setDraft(selected);
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [open, selected]);
  useEffect(() => {
    if (!open) return;
    const frame = requestAnimationFrame(() => menu.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }));
    return () => cancelAnimationFrame(frame);
  }, [open]);
  const trackQuantities = quantities;
  const available = useMemo(() => uniqueSorted([...options, ...selected.map(itemName)]).map(itemName), [options, selected]);
  const results = available.filter(item => item.toLowerCase().includes(query.trim().toLowerCase()));
  const exactMatch = available.some(item => item.toLowerCase() === query.trim().toLowerCase());
  const commit = (items: string[]) => {
    const next = uniqueSorted(items);
    draftRef.current = next;
    setDraft(next);
    if (!doneButton) onChange(next);
  };
  const quantityFor = (name: string) => { const match = draftRef.current.find(value => itemName(value).toLowerCase() === name.toLowerCase()); return match ? itemQuantity(match) : 0; };
  const setQuantity = (name: string, quantity: number) => commit([...draftRef.current.filter(value => itemName(value).toLowerCase() !== name.toLowerCase()), ...(quantity > 0 ? [quantity === 1 ? name : `${name} × ${quantity}`] : [])]);
  const toggle = (item: string) => { const latest = draftRef.current; trackQuantities ? setQuantity(item, quantityFor(item) ? 0 : 1) : commit(latest.some(value => value.toLowerCase() === item.toLowerCase()) ? latest.filter(value => value.toLowerCase() !== item.toLowerCase()) : [...latest, item]); };
  const addCustom = () => { const item = query.trim(); if (!item) return; trackQuantities ? setQuantity(item, 1) : commit([...draftRef.current, item]); setQuery(""); };
  const finish = () => { const next = uniqueSorted(draftRef.current); onChange(next); setOpen(false); setQuery(""); };
  const removeSelected = (item: string) => onChange(selected.filter(value => itemName(value).toLowerCase() !== itemName(item).toLowerCase()));

  return <div ref={root} className="relative mt-2">
    <button ref={trigger} type="button" onClick={() => { draftRef.current = selected; setDraft(selected); setOpen(value => !value); }} className={`flex w-full items-center justify-between rounded-xl border px-3 py-2.5 text-left text-sm ${dark ? "border-white/15 bg-white/5 text-white" : "border-zinc-200 bg-white dark:border-white/10 dark:bg-black/20"}`}><span className={selected.length ? "font-semibold" : "text-zinc-500"}>{selected.length ? `${selected.length} selected` : `Search ${label.toLowerCase()}`}</span><ChevronDown className={`h-4 w-4 transition ${open ? "rotate-180" : ""}`}/></button>
    {selected.length > 0 && <div className="mt-2 flex flex-wrap gap-2">{uniqueSorted(selected).map(item => <span key={itemName(item)} className={`inline-flex h-9 min-h-9 max-w-full items-center gap-1 whitespace-nowrap rounded-full border px-3 py-2 text-sm font-medium leading-none md:h-auto md:min-h-0 md:px-2.5 md:py-1 md:text-xs md:font-semibold md:leading-normal ${dark ? "border-white/15 bg-transparent text-white" : "border-zinc-200 dark:border-white/10"}`}><span className="min-w-0 truncate">{trackQuantities && itemQuantity(item) > 1 ? `${itemName(item)} (${itemQuantity(item)})` : itemName(item)}</span><button type="button" aria-label={`Remove ${itemName(item)}`} onClick={() => removeSelected(item)} className="shrink-0"><X className="h-3 w-3"/></button></span>)}</div>}
    {open && <div ref={menu} className={`absolute top-11 z-50 w-full overflow-hidden rounded-xl border shadow-2xl ${dark ? "border-white/15 bg-[#171a17] text-white" : "border-zinc-200 bg-white dark:border-white/10 dark:bg-neutral-900"}`}>
      <label className="flex items-center gap-2 border-b border-current/10 px-3"><Search className="h-4 w-4 text-[#22c55e]"/><input autoFocus value={query} onChange={event => setQuery(event.target.value)} placeholder={`Search ${label.toLowerCase()}…`} className="w-full bg-transparent py-3 text-sm outline-none"/></label>
      <div className="max-h-64 overflow-y-auto p-1">
        {results.map(item => {
          const quantity = quantityFor(item), checked = quantity > 0;
          return trackQuantities ? <div key={item} className="group relative flex min-h-11 items-center gap-2 rounded-lg px-3 py-1.5 hover:bg-[#22c55e]/10">
            <button type="button" aria-label={`${checked ? "Deselect" : "Select"} ${item}`} onClick={() => toggle(item)} className="absolute inset-0 z-0 rounded-lg"/>
            <div className="pointer-events-none relative z-[1] flex min-w-0 flex-1 items-center gap-2 text-left text-sm"><span className="truncate">{item}</span>{checked && <UniversalCheckboxMark checked/>}</div>
            <div className="facility-quantity-controls relative z-10 flex shrink-0 items-center gap-1 opacity-100 transition md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100"><button type="button" aria-label={`Subtract ${item}`} disabled={!quantity} onClick={() => setQuantity(item, Math.max(0, quantity - 1))} className="grid h-7 w-7 place-items-center rounded-full border border-current/20 disabled:opacity-30"><Minus className="h-3.5 w-3.5"/></button><span className="w-6 text-center text-xs font-black">{quantity}</span><button type="button" aria-label={`Add ${item}`} onClick={() => setQuantity(item, quantity + 1)} className="grid h-7 w-7 place-items-center rounded-full border border-current/20"><Plus className="h-3.5 w-3.5"/></button></div>
          </div> : <div key={item} className="group relative flex min-h-11 items-center gap-2 rounded-lg px-3 py-1.5 hover:bg-[#22c55e]/10">
            <button type="button" aria-label={`${checked ? "Deselect" : "Select"} ${item}`} onClick={() => toggle(item)} className="absolute inset-0 z-0 rounded-lg"/>
            <div className="pointer-events-none relative z-[1] flex min-w-0 flex-1 items-center gap-2 text-left text-sm"><span className="truncate">{item}</span>{checked && <UniversalCheckboxMark checked/>}</div>
          </div>;
        })}
        {allowCustom && !results.length && query.trim() && !exactMatch && <div className="group relative flex min-h-11 items-center gap-2 rounded-lg px-3 py-1.5 text-[#22c55e] hover:bg-[#22c55e]/10">
          <button type="button" aria-label={`Add ${query.trim()}`} onClick={addCustom} className="absolute inset-0 z-0 rounded-lg"/>
          <div className="pointer-events-none relative z-[1] flex min-w-0 items-center gap-2 text-left text-sm font-bold"><Plus className="h-4 w-4 shrink-0"/><span className="truncate">Add “{query.trim()}”</span></div>
        </div>}
        {!results.length && (!query.trim() || !allowCustom) && <p className="p-4 text-center text-sm text-zinc-500">No options found.</p>}
      </div>
      {doneButton && <div className="border-t border-current/10 p-3"><button type="button" onClick={finish} className="w-full rounded-full bg-[#22c55e] px-4 py-2.5 text-sm font-black text-black">Done</button></div>}
    </div>}
  </div>;
}
