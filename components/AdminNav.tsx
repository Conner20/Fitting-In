import Link from "next/link";

const items = [{ href: "/admin", label: "Overview", key: "overview" }, { href: "/admin/gyms", label: "Gyms", key: "gyms" }, { href: "/admin/nutrition", label: "Nutrition", key: "nutrition" }, { href: "/admin/legal", label: "Legal", key: "legal" }] as const;

export default function AdminNav({ active }: { active: typeof items[number]["key"] }) {
    return <nav aria-label="Admin sections" className="flex w-full min-w-0 flex-nowrap items-center justify-start gap-1.5 whitespace-nowrap text-zinc-600 sm:gap-2 dark:text-white/60">{items.map((item) => <Link key={item.key} href={item.href} className={`inline-flex h-9 min-w-0 shrink-0 items-center justify-center truncate rounded-full border px-[.85rem] text-center text-[.78rem] font-bold leading-none shadow-none transition ${active === item.key ? "border-[#22c55e] bg-[#22c55e] text-black shadow-none" : "border-white/15 text-white/70 hover:border-white"}`}>{item.label}</Link>)}</nav>;
}
