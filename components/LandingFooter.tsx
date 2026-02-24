'use client';

import Link from 'next/link';

export default function LandingFooter() {
    return (
        <footer className="border-t border-black/10 dark:border-white/10">
            <div className="mx-auto flex flex-col items-center justify-between gap-4 px-4 py-8 text-sm text-neutral-600 dark:text-neutral-400 sm:flex-row sm:px-6 lg:max-w-7xl">
                <span>
                    <span>fitt</span>
                    <span className="underline decoration-2 decoration-neutral-600 underline-offset-[2px] dark:decoration-neutral-400">in</span>
                    <span>g</span>
                </span>
                <div className="flex flex-wrap items-center justify-center gap-4">
                    <Link href="/legal/terms" className="transition hover:text-black dark:hover:text-white">
                        Terms
                    </Link>
                    <Link href="/legal/privacy" className="transition hover:text-black dark:hover:text-white">
                        Privacy
                    </Link>
                    <Link href="/legal/support" className="transition hover:text-black dark:hover:text-white">
                        Support
                    </Link>
                </div>
            </div>
        </footer>
    );
}
