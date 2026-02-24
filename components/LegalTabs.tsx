'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const TABS = [
    { href: '/legal/terms', label: 'Terms of Service' },
    { href: '/legal/privacy', label: 'Privacy Policy' },
    { href: '/legal/support', label: 'Support' },
];

export default function LegalTabs() {
    const pathname = usePathname();

    return (
        <div className="w-full rounded-3xl border border-neutral-200 bg-white/90 p-2 shadow-sm dark:border-neutral-800 dark:bg-neutral-900/70">
            <div className="grid w-full gap-2 text-sm sm:grid-cols-3">
                {TABS.map((tab) => {
                    const active = pathname === tab.href;
                    return (
                        <Link
                            key={tab.href}
                            href={tab.href}
                            className={`rounded-2xl px-4 py-2 text-center transition ${
                                active
                                    ? 'bg-black text-white shadow-sm dark:bg-white dark:text-black'
                                    : 'text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800'
                            }`}
                        >
                            {tab.label}
                        </Link>
                    );
                })}
            </div>
        </div>
    );
}
