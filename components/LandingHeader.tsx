'use client';

import Link from 'next/link';

export default function LandingHeader() {
    return (
        <header
            className="sticky top-0 z-50 border-b bg-white/80 backdrop-blur dark:border-white/10 dark:bg-black/40"
            style={{
                paddingTop: 'env(safe-area-inset-top, 0px)',
            }}
        >
            <div className="mx-auto flex max-w-7xl items-center justify-between gap-2 px-3 py-3 sm:px-6 sm:py-4">
                <Link href="/" className="shrink-0 text-xl font-semibold tracking-tight text-[#22c55e] sm:text-2xl">
                    <span>fitt</span>
                    <span className="underline decoration-2 decoration-green-700 underline-offset-[2px] dark:decoration-green-400">
                        in
                    </span>
                    <span>g</span>
                </Link>

                <nav className="flex items-center gap-1.5 sm:gap-2">
                    <Link
                        href="/log-in"
                        className="rounded-full border px-3 py-2 text-sm transition hover:bg-transparent hover:text-white sm:px-4 dark:border-white/25 dark:text-white dark:hover:bg-transparent"
                    >
                        log in
                    </Link>
                    <Link
                        href="/sign-up"
                        className="rounded-full bg-[#22c55e] px-3 py-2 text-sm font-semibold text-black transition hover:bg-[#19a94e] sm:px-4"
                    >
                        sign up
                    </Link>
                </nav>
            </div>
        </header>
    );
}
