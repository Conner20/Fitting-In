import Link from "next/link";

const items = [{ href: "/admin", label: "Overview", key: "overview" }, { href: "/admin/gyms", label: "Gyms", key: "gyms" }, { href: "/admin/nutrition", label: "Nutrition", key: "nutrition" }, { href: "/admin/legal", label: "Legal", key: "legal" }] as const;

export default function AdminNav({ active }: { active: typeof items[number]["key"] }) {
    return <nav aria-label="Admin sections" className="grid w-full min-w-0 grid-cols-4 gap-1 whitespace-nowrap text-zinc-600 sm:gap-2 dark:text-white/60">{items.map((item) => <Link key={item.key} href={item.href} className={`inline-flex h-9 min-w-0 items-center justify-center truncate rounded-full border px-[.85rem] text-center text-[.78rem] font-bold leading-none transition hover:border-[#22c55e]/50 hover:text-[#22c55e] ${active === item.key ? "border-[#22c55e] bg-[#22c55e] text-black" : "border-transparent text-zinc-600 dark:text-white/70"}`}>{item.label}</Link>)}</nav>;
}
