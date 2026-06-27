'use client';

import { Bell, BriefcaseBusiness, ChevronRight, Search as SearchIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import MobileHeader from "@/components/MobileHeader";
import HomeAnnouncement from "@/components/HomeAnnouncement";
import HomePosts from "@/components/HomePosts";
import NotificationsModal from "@/components/NotificationsModal";
import { useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { useLiveRefresh } from "@/app/hooks/useLiveRefresh";
import { useCurrentUserRole } from "@/app/hooks/useCurrentUserRole";

type HomePageShellProps = {
    posts: any;
    announcement?: {
        id: string;
        title: string;
        content: string;
        imageUrl?: string | null;
        imageUrls?: string[];
        createdAt: string;
    } | null;
    isAdmin?: boolean;
    initialRole?: "TRAINEE" | "TRAINER" | "GYM" | null;
};

type NotificationListItem = {
    createdAt: string;
};

type HomeSearchResult = {
    id: string;
    username: string | null;
    name: string | null;
    image: string | null;
    role: "TRAINEE" | "TRAINER" | "GYM" | null;
};

export default function HomePageShell({ posts, announcement = null, isAdmin = false, initialRole = null }: HomePageShellProps) {
    const router = useRouter();
    const { data: session } = useSession();
    const { role } = useCurrentUserRole();
    const [notificationsOpen, setNotificationsOpen] = useState(false);
    const [notificationCount, setNotificationCount] = useState(0);
    const [lastNotificationsSeenAt, setLastNotificationsSeenAt] = useState(0);
    const [feedRefreshToken, setFeedRefreshToken] = useState(0);
    const [isRefreshingFeed, setIsRefreshingFeed] = useState(false);
    const [currentAnnouncement, setCurrentAnnouncement] = useState(announcement);
    const [isDeletingAnnouncement, setIsDeletingAnnouncement] = useState(false);
    const [pullDistance, setPullDistance] = useState(0);
    const [headerSearch, setHeaderSearch] = useState("");
    const [headerSearchResults, setHeaderSearchResults] = useState<HomeSearchResult[]>([]);
    const [headerSearchOpen, setHeaderSearchOpen] = useState(false);
    const [headerSearchLoading, setHeaderSearchLoading] = useState(false);
    const [headerSearchHasMore, setHeaderSearchHasMore] = useState(false);
    const [mobileNavOpen, setMobileNavOpen] = useState(true);
    const [isDesktop, setIsDesktop] = useState(false);
    const [stableRole, setStableRole] = useState<"TRAINEE" | "TRAINER" | "GYM" | null>(initialRole);
    const isSignedIn = Boolean(session?.user?.id);
    const touchStartYRef = useRef<number | null>(null);
    const pullActiveRef = useRef(false);
    const mobileSearchContainerRef = useRef<HTMLDivElement | null>(null);
    const desktopSearchContainerRef = useRef<HTMLDivElement | null>(null);
    const PULL_THRESHOLD = 72;

    const refreshHomeFeed = async () => {
        if (isRefreshingFeed) return;
        setIsRefreshingFeed(true);
        setFeedRefreshToken((prev) => prev + 1);
        window.setTimeout(() => {
            setIsRefreshingFeed(false);
            setPullDistance(0);
        }, 700);
    };

    const refreshNotificationCount = async () => {
        if (!isSignedIn) return;
        try {
            const res = await fetch("/api/user/notifications", { cache: "no-store" });
            if (!res.ok) return;
            const data = await res.json();
            const items: NotificationListItem[] = Array.isArray(data?.items) ? data.items : [];
            const seenAt = data?.seenAt ? new Date(data.seenAt).getTime() : 0;
            setLastNotificationsSeenAt(seenAt);
            const unread = items.filter((item) => new Date(item.createdAt).getTime() > seenAt).length;
            setNotificationCount(unread);
        } catch {
            // ignore transient notification fetch issues
        }
    };

    useEffect(() => {
        if (!isSignedIn) return;
        refreshNotificationCount();
    }, [isSignedIn]);

    useEffect(() => {
        if (!role) return;
        setStableRole(role);
    }, [role]);

    useEffect(() => {
        setCurrentAnnouncement(announcement);
    }, [announcement]);

    useEffect(() => {
        if (typeof window === "undefined") return;

        const syncViewport = () => setIsDesktop(window.innerWidth >= 1024);
        syncViewport();
        window.addEventListener("resize", syncViewport);
        return () => window.removeEventListener("resize", syncViewport);
    }, []);

    useEffect(() => {
        if (typeof window === "undefined") return;

        const handlePointerDown = (event: MouseEvent) => {
            const target = event.target as Node;
            const clickedInsideMobile = mobileSearchContainerRef.current?.contains(target);
            const clickedInsideDesktop = desktopSearchContainerRef.current?.contains(target);
            if (!clickedInsideMobile && !clickedInsideDesktop) {
                setHeaderSearchOpen(false);
            }
        };

        window.addEventListener("mousedown", handlePointerDown);
        return () => window.removeEventListener("mousedown", handlePointerDown);
    }, []);

    useLiveRefresh(refreshNotificationCount, { enabled: isSignedIn, interval: 5000 });

    const handleDeleteAnnouncement = async () => {
        if (!isAdmin || isDeletingAnnouncement) return;

        try {
            setIsDeletingAnnouncement(true);
            const res = await fetch("/api/admin/announcement", { method: "DELETE" });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data?.message || "Failed to delete announcement.");
            setCurrentAnnouncement(null);
        } catch (error) {
            alert(error instanceof Error ? error.message : "Failed to delete announcement.");
        } finally {
            setIsDeletingAnnouncement(false);
        }
    };

    const openNotifications = async () => {
        setNotificationsOpen(true);
        if (isSignedIn) {
            try {
                const res = await fetch("/api/user/notifications", { cache: "no-store" });
                if (res.ok) {
                    const data = await res.json();
                    const previousSeenAt = data?.seenAt ? new Date(data.seenAt).getTime() : 0;
                    setLastNotificationsSeenAt(previousSeenAt);
                }
            } catch {
                // ignore
            }
            try {
                await fetch("/api/user/notifications", { method: "POST" });
            } catch {
                // ignore
            }
        }
        setNotificationCount(0);
    };

    const AdminButton = ({ className = "" }: { className?: string }) =>
        isAdmin ? (
            <Link
                href="/admin"
                aria-label="Admin console"
                className={`inline-flex h-10 w-10 items-center justify-center gap-2 rounded-full border border-zinc-200 bg-zinc-200 px-0 text-zinc-700 transition hover:bg-zinc-300 dark:border-white/20 dark:bg-neutral-800 dark:text-white dark:hover:bg-neutral-700 lg:w-auto lg:px-4 ${className}`}
            >
                <BriefcaseBusiness size={18} />
                <span className="hidden text-sm font-medium lg:inline">Admin</span>
            </Link>
        ) : null;

    const NotificationsButton = ({
        className = "",
    }: {
        className?: string;
    }) => (
        <button
            type="button"
            aria-label="Notifications"
            onClick={openNotifications}
            className={`relative inline-flex h-10 w-10 items-center justify-center gap-2 rounded-full border border-zinc-200 bg-zinc-200 px-0 text-zinc-700 transition hover:bg-zinc-300 dark:border-white/20 dark:bg-neutral-800 dark:text-white dark:hover:bg-neutral-700 lg:min-w-[152px] lg:justify-center lg:px-4 ${className}`}
        >
            <span className="relative inline-flex shrink-0">
                <Bell size={18} />
                {notificationCount > 0 && (
                    <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold leading-none text-white">
                        {notificationCount > 9 ? "9+" : notificationCount}
                    </span>
                )}
            </span>
            <span className="hidden text-sm font-medium lg:inline">Notifications</span>
        </button>
    );

    const handleTouchStart = (event: React.TouchEvent<HTMLElement>) => {
        if (window.innerWidth >= 1024 || window.scrollY > 0 || isRefreshingFeed) return;
        touchStartYRef.current = event.touches[0]?.clientY ?? null;
        pullActiveRef.current = true;
    };

    const handleTouchMove = (event: React.TouchEvent<HTMLElement>) => {
        if (!pullActiveRef.current || touchStartYRef.current === null) return;
        const currentY = event.touches[0]?.clientY ?? touchStartYRef.current;
        const nextDistance = Math.max(0, currentY - touchStartYRef.current);
        if (window.scrollY <= 0 && nextDistance > 0) {
            setPullDistance(Math.min(nextDistance, 96));
        } else {
            pullActiveRef.current = false;
            touchStartYRef.current = null;
            setPullDistance(0);
        }
    };

    const handleTouchEnd = async () => {
        if (!pullActiveRef.current) {
            setPullDistance(0);
            return;
        }

        const shouldRefresh = pullDistance >= PULL_THRESHOLD;
        pullActiveRef.current = false;
        touchStartYRef.current = null;

        if (shouldRefresh) {
            await refreshHomeFeed();
            return;
        }

        setPullDistance(0);
    };

    const sessionRole = (session?.user as { role?: "TRAINEE" | "TRAINER" | "GYM" | null } | undefined)?.role ?? null;
    const effectiveRole = role ?? sessionRole ?? stableRole ?? initialRole;

    const headerSearchPlaceholder =
        effectiveRole === "TRAINEE"
            ? "Find gyms and trainers"
            : effectiveRole === "TRAINER"
                ? "Find clients and gyms"
                : effectiveRole === "GYM"
                    ? "Find members and trainers"
                    : "";

    const mobileHeaderSearchWidthClass =
        effectiveRole === "TRAINEE"
            ? "w-[min(67vw,300px)] max-w-[calc(100vw-8.5rem)] min-w-0"
            : effectiveRole === "TRAINER"
                ? "w-[min(65vw,290px)] max-w-[calc(100vw-8.5rem)] min-w-0"
                : effectiveRole === "GYM"
                    ? "w-[min(67vw,300px)] max-w-[calc(100vw-8.5rem)] min-w-0"
                    : "w-[min(67vw,300px)] max-w-[calc(100vw-8.5rem)] min-w-0";

    const desktopHeaderSearchWidthClass =
        effectiveRole === "TRAINEE"
            ? "w-[400px]"
            : effectiveRole === "TRAINER"
                ? "w-[390px]"
                : effectiveRole === "GYM"
                    ? "w-[430px]"
                    : "w-[430px]";

    const handleHeaderSearchSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const nextQuery = headerSearch.trim();
        router.push(nextQuery ? `/search?q=${encodeURIComponent(nextQuery)}` : "/search");
    };

    useEffect(() => {
        const query = headerSearch.trim();

        if (!query) {
            setHeaderSearchResults([]);
            setHeaderSearchHasMore(false);
            setHeaderSearchLoading(false);
            return;
        }

        let cancelled = false;
        setHeaderSearchLoading(true);

        const timeoutId = window.setTimeout(async () => {
            try {
                const params = new URLSearchParams({
                    q: query,
                    page: "1",
                    pageSize: "6",
                });
                const res = await fetch(`/api/search?${params.toString()}`, { cache: "no-store" });
                if (!res.ok) throw new Error();
                const json = await res.json().catch(() => null);
                if (cancelled) return;
                const results = Array.isArray(json?.results) ? json.results.filter((user: HomeSearchResult) => Boolean(user.role)) : [];
                setHeaderSearchResults(results.slice(0, 5));
                setHeaderSearchHasMore((json?.total ?? results.length) > 5 || results.length > 5);
            } catch {
                if (!cancelled) {
                    setHeaderSearchResults([]);
                    setHeaderSearchHasMore(false);
                }
            } finally {
                if (!cancelled) {
                    setHeaderSearchLoading(false);
                }
            }
        }, 180);

        return () => {
            cancelled = true;
            window.clearTimeout(timeoutId);
        };
    }, [headerSearch]);

    const pushHomeSearch = (query: string, selectedUserId?: string) => {
        const trimmed = query.trim();
        if (!trimmed) {
            router.push("/search");
            return;
        }

        const params = new URLSearchParams({ q: trimmed });
        if (selectedUserId) {
            params.set("selectedId", selectedUserId);
            params.set("view", "details");
        }
        router.push(`/search?${params.toString()}`);
    };

    const handleBrowseClick = () => {
        setHeaderSearchOpen(false);
        pushHomeSearch(headerSearch);
    };

    const renderHeaderSearchResults = () => {
        if (!headerSearchOpen || !headerSearch.trim()) return null;

        return (
            <div className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-30 overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-white/10 dark:bg-neutral-900">
                {headerSearchLoading ? (
                    <div className="px-4 py-3 text-sm text-zinc-500 dark:text-gray-400">Searching...</div>
                ) : headerSearchResults.length === 0 ? (
                    <div className="px-4 py-3 text-left text-sm text-zinc-500 dark:text-gray-400">No results</div>
                ) : (
                    <>
                        {headerSearchResults.map((result) => {
                            const display = result.name || result.username || "User";
                            return (
                                <button
                                    key={result.id}
                                    type="button"
                                    onClick={() => {
                                        setHeaderSearchOpen(false);
                                        pushHomeSearch(headerSearch, result.id);
                                    }}
                                    className="block w-full border-b border-zinc-100 px-4 py-3 text-left transition hover:bg-zinc-50 dark:border-white/5 dark:hover:bg-white/5"
                                >
                                    <div className="flex items-center gap-3">
                                        {result.image ? (
                                            // eslint-disable-next-line @next/next/no-img-element
                                            <img
                                                src={result.image}
                                                alt={display}
                                                className="h-9 w-9 shrink-0 rounded-full border border-zinc-200 object-cover dark:border-white/10"
                                            />
                                        ) : (
                                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-zinc-200 bg-zinc-100 text-xs font-semibold text-zinc-700 dark:border-white/10 dark:bg-white/10 dark:text-white">
                                                {(result.username || result.name || "U").slice(0, 2).toUpperCase()}
                                            </div>
                                        )}
                                        <div className="min-w-0">
                                            <div className="truncate text-sm font-medium text-zinc-900 dark:text-white">{display}</div>
                                            {result.role && (
                                                <div className="mt-0.5 text-xs capitalize text-zinc-500 dark:text-gray-400">
                                                    {result.role.toLowerCase()}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </button>
                            );
                        })}
                        {headerSearchHasMore && (
                            <button
                                type="button"
                                onClick={() => {
                                    setHeaderSearchOpen(false);
                                    pushHomeSearch(headerSearch);
                                }}
                                className="block w-full px-4 py-3 text-left text-sm font-medium text-green-700 transition hover:bg-zinc-50 dark:text-green-400 dark:hover:bg-white/5"
                            >
                                See more results...
                            </button>
                        )}
                    </>
                )}
            </div>
        );
    };

    const mobileHeaderSearch = (
        <div ref={mobileSearchContainerRef} className="relative">
            <form
                onSubmit={handleHeaderSearchSubmit}
                className={`relative flex ${mobileHeaderSearchWidthClass} items-center gap-2 rounded-lg border border-zinc-200 bg-white/80 px-3 py-2 dark:border-white/15 dark:bg-white/5 ${
                    headerSearchOpen ? "pr-[4.75rem]" : "pr-3"
                }`}
            >
                <SearchIcon size={18} className="shrink-0 text-gray-500 dark:text-gray-400" />
                <input
                    value={headerSearch}
                    onFocus={() => setHeaderSearchOpen(true)}
                    onChange={(event) => {
                        setHeaderSearch(event.target.value);
                        setHeaderSearchOpen(true);
                    }}
                    placeholder={headerSearchPlaceholder}
                    className="flex-1 min-w-0 bg-transparent text-sm text-zinc-900 outline-none placeholder:text-zinc-500 dark:text-white dark:placeholder:text-gray-400"
                />
                <button
                    type="button"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={handleBrowseClick}
                    tabIndex={headerSearchOpen ? 0 : -1}
                    aria-hidden={!headerSearchOpen}
                    className={`absolute right-2 inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-xs font-medium text-green-700 transition hover:text-green-800 dark:text-green-400 dark:hover:text-green-300 ${
                        headerSearchOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
                    }`}
                >
                    <span>Browse</span>
                    <ChevronRight size={12} />
                </button>
            </form>
            {renderHeaderSearchResults()}
        </div>
    );

    return (
        <>
            <div className="relative flex min-h-screen flex-col bg-[#f8f8f8] text-black transition-colors dark:bg-[#050505] dark:text-white">
                <MobileHeader
                    title="fitting"
                    href="/"
                    titleAlign="left"
                    rightAccessory={mobileHeaderSearch}
                    onMobileNavVisibilityChange={setMobileNavOpen}
                />

                <header className="hidden w-full items-center justify-between bg-white px-6 py-5 lg:flex dark:bg-neutral-900">
                    <Link href="/" className="text-2xl font-semibold tracking-tight text-green-700 dark:text-green-400">
                        <span>fitt</span>
                        <span className="underline decoration-2 decoration-green-700 underline-offset-[2px] dark:decoration-green-400">in</span>
                        <span>g</span>
                    </Link>
                    <div ref={desktopSearchContainerRef} className="relative hidden items-center lg:flex">
                        <form
                            onSubmit={handleHeaderSearchSubmit}
                            className={`relative flex ${desktopHeaderSearchWidthClass} items-center gap-2 rounded-lg border border-zinc-200 bg-white/80 px-3 py-2 dark:border-white/15 dark:bg-white/5 ${
                                headerSearchOpen ? "pr-[6.5rem]" : "pr-3"
                            }`}
                        >
                            <SearchIcon size={18} className="shrink-0 text-gray-500 dark:text-gray-400" />
                            <input
                                value={headerSearch}
                                onFocus={() => setHeaderSearchOpen(true)}
                                onChange={(event) => {
                                    setHeaderSearch(event.target.value);
                                    setHeaderSearchOpen(true);
                                }}
                                placeholder={headerSearchPlaceholder}
                                className="flex-1 min-w-0 bg-transparent text-sm text-zinc-900 outline-none placeholder:text-zinc-500 dark:text-white dark:placeholder:text-gray-400"
                            />
                            <button
                                type="button"
                                onMouseDown={(event) => event.preventDefault()}
                                onClick={handleBrowseClick}
                                tabIndex={headerSearchOpen ? 0 : -1}
                                aria-hidden={!headerSearchOpen}
                                className={`absolute right-3 inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium text-green-700 transition hover:text-green-800 dark:text-green-400 dark:hover:text-green-300 ${
                                    headerSearchOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
                                }`}
                            >
                                <span>Browse</span>
                                <ChevronRight size={13} />
                            </button>
                        </form>
                        {renderHeaderSearchResults()}
                    </div>
                </header>

                <main
                    className="flex w-full flex-1 justify-center px-4 sm:px-6"
                    onTouchStart={handleTouchStart}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                    onTouchCancel={handleTouchEnd}
                >
                    <div className="w-full max-w-3xl">
                        <div className="lg:hidden">
                            <div
                                className="flex items-center justify-center overflow-hidden transition-all"
                                style={{ height: isRefreshingFeed ? 40 : Math.min(pullDistance * 0.55, 40) }}
                            >
                                {(isRefreshingFeed || pullDistance > 0) && (
                                    <span
                                        className={`h-5 w-5 rounded-full border-2 border-black border-t-transparent dark:border-white dark:border-t-transparent ${
                                            isRefreshingFeed || pullDistance >= PULL_THRESHOLD ? "animate-spin" : ""
                                        }`}
                                    />
                                )}
                            </div>
                        </div>
                        {currentAnnouncement && (
                            <HomeAnnouncement
                                announcement={currentAnnouncement}
                                isAdmin={isAdmin}
                                deleting={isDeletingAnnouncement}
                                onDelete={() => void handleDeleteAnnouncement()}
                            />
                        )}
                        <HomePosts initialPosts={posts} refreshToken={feedRefreshToken} />
                    </div>
                </main>

                <div
                    className="fixed left-4 z-40 transition-[bottom] duration-200 lg:left-6 lg:transition-none"
                    style={{
                        bottom: isDesktop
                            ? "1.5rem"
                            : mobileNavOpen
                                ? "calc(5.5rem + env(safe-area-inset-bottom, 0px))"
                                : "calc(1rem + env(safe-area-inset-bottom, 0px))",
                    }}
                >
                    <AdminButton className="shadow-sm" />
                </div>

                <div
                    className="fixed right-4 z-40 transition-[bottom] duration-200 lg:right-24 lg:transition-none"
                    style={{
                        bottom: isDesktop
                            ? "1.5rem"
                            : mobileNavOpen
                                ? "calc(5.5rem + env(safe-area-inset-bottom, 0px))"
                                : "calc(1rem + env(safe-area-inset-bottom, 0px))",
                    }}
                >
                    <NotificationsButton className="shadow-sm" />
                </div>
            </div>
            <NotificationsModal
                open={notificationsOpen}
                onClose={() => setNotificationsOpen(false)}
                onAnyChange={refreshNotificationCount}
                seenAt={lastNotificationsSeenAt}
            />
        </>
    );
}
