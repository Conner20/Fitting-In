"use client";

import { Check } from "lucide-react";
import { InputHTMLAttributes } from "react";

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "className"> & {
  className?: string;
};

export function UniversalCheckboxMark({ checked, className = "" }: { checked: boolean; className?: string }) {
  return <span aria-hidden="true" className={`grid h-5 w-5 shrink-0 place-items-center rounded border bg-white text-[#22c55e] transition dark:bg-black/50 ${checked ? "border-[#22c55e]" : "border-zinc-300 dark:border-white/20"} ${className}`}>
    <Check className={`h-3.5 w-3.5 transition ${checked ? "opacity-100" : "opacity-0"}`} strokeWidth={3} />
  </span>;
}

export default function UniversalCheckbox({ className = "", disabled, checked = false, ...props }: Props) {
  return <span className={`relative inline-grid h-5 w-5 shrink-0 place-items-center ${disabled ? "opacity-45" : ""} ${className}`}>
    <input {...props} type="checkbox" checked={checked} disabled={disabled} className="peer absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0 disabled:cursor-not-allowed" />
    <UniversalCheckboxMark checked={Boolean(checked)} className="peer-focus-visible:ring-2 peer-focus-visible:ring-[#22c55e] peer-focus-visible:ring-offset-2 dark:peer-focus-visible:ring-offset-neutral-900" />
  </span>;
}
