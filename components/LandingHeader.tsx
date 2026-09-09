'use client';

import Link from 'next/link';

export default function LandingHeader() {
    return (
        <header className="relative z-[1200] border-b bg-white text-[#1c241c] dark:border-white/10 dark:bg-[#0b0d0b] dark:text-white">
            <div className="landing-primary-header-row flex min-h-16 flex-wrap items-center gap-2 px-3 py-2 sm:h-16 sm:flex-nowrap sm:gap-4 sm:px-4 sm:py-0">
                <Link href="/" className="shrink-0 text-[22px] font-black text-[#22c55e]">
                    fitt<span className="underline">in</span>g
                </Link>

                <nav className="ml-auto flex shrink-0 items-center gap-1 sm:gap-2">
                    <Link
                        href="/log-in"
                        className="px-2 py-2 text-xs font-semibold transition hover:text-[#22c55e] sm:px-3 sm:text-sm"
                    >
                        Log in
                    </Link>
                    <Link
                        href="/sign-up"
                        className="rounded-full bg-[#22c55e] px-3 py-2 text-xs font-bold text-black sm:px-4 sm:text-sm"
                    >
                        Sign up
                    </Link>
                </nav>
            </div>
        </header>
    );
}
