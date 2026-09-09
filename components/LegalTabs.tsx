'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const TABS = [
    { href: '/legal/terms', label: 'Terms of Use' },
    { href: '/legal/privacy', label: 'Privacy Policy' },
    { href: '/legal/support', label: 'Support' },
];

export default function LegalTabs() {
    const pathname = usePathname();

    return (
        <nav aria-label="Legal pages" className="border-b border-white/10 bg-[#090b09] px-3 py-3 sm:px-4">
            <div className="mx-auto flex w-full items-center justify-center gap-2 text-xs sm:text-sm">
                {TABS.map((tab) => {
                    const active = pathname === tab.href;
                    return (
                        <Link
                            key={tab.href}
                            href={tab.href}
                            className={`whitespace-nowrap rounded-full border px-3 py-2 text-center font-bold shadow-none transition sm:px-4 ${
                                active
                                    ? 'border-[#22c55e] bg-[#22c55e] text-black shadow-none'
                                    : 'border-white/10 bg-[#111411] text-white/60 hover:border-white/30 hover:text-white'
                            }`}
                        >
                            {tab.label}
                        </Link>
                    );
                })}
            </div>
        </nav>
    );
}
