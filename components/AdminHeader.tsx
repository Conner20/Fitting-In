import Link from "next/link";
import AdminNav from "@/components/AdminNav";

type AdminSection = "overview" | "gyms" | "nutrition";

export default function AdminHeader({ active }: { active: AdminSection }) {
  return (
    <header className="relative z-[1200] border-b bg-white text-[#1c241c] dark:border-white/10 dark:bg-[#0b0d0b] dark:text-white">
      <div className="landing-primary-header-row flex min-h-16 items-center gap-2 px-3 py-2 md:h-16 md:gap-4 md:px-4 md:py-0">
        <Link href="/" aria-label="Return to Fitting In" className="shrink-0 text-[22px] font-black text-[#22c55e]">
          fitt<span className="underline">in</span>g
        </Link>
      </div>
      <div className="flex h-[58px] items-center gap-3 overflow-x-auto border-t px-4 dark:border-white/10">
        <AdminNav active={active} />
      </div>
    </header>
  );
}
