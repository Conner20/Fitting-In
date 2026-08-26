import Link from "next/link";

const items = [{ href: "/admin", label: "Overview", key: "overview" }, { href: "/admin/gyms", label: "Gyms", key: "gyms" }, { href: "/admin/nutrition", label: "Nutrition", key: "nutrition" }] as const;

export default function AdminNav({ active, mobile = false }: { active: typeof items[number]["key"]; mobile?: boolean }) {
    return <nav aria-label="Admin sections" className={mobile ? "scrollbar-slim flex w-full gap-2 overflow-x-auto pb-1 lg:hidden" : "scrollbar-slim flex w-full gap-2 overflow-x-auto pb-1 text-sm text-zinc-600 sm:gap-4 dark:text-white/60"}>{items.map((item) => <Link key={item.key} href={item.href} className={`shrink-0 rounded-full border font-medium transition hover:border-[#22c55e]/50 hover:text-[#22c55e] ${mobile ? "px-4 py-2 text-sm" : "px-4 py-1.5"} ${active === item.key ? "border-[#22c55e] bg-[#22c55e] text-black" : "border-transparent text-zinc-600 dark:text-white/70"}`}>{item.label}</Link>)}</nav>;
}
