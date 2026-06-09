'use client';

import clsx from "clsx";
import { Heart } from "lucide-react";

type FavoriteButtonProps = {
    favorited: boolean;
    onClick: () => void;
    animating?: boolean;
    iconOnly?: boolean;
    compact?: boolean;
    variant?: "plain" | "button";
    className?: string;
    title?: string;
    disabled?: boolean;
};

export default function FavoriteButton({
    favorited,
    onClick,
    animating = false,
    iconOnly = false,
    compact = false,
    variant = "button",
    className,
    title,
    disabled = false,
}: FavoriteButtonProps) {
    const isPlain = variant === "plain";

    return (
        <button
            type="button"
            onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                onClick();
            }}
            disabled={disabled}
            title={title ?? (favorited ? "Favorited" : "Favorite")}
            aria-label={favorited ? "Favorited" : "Favorite"}
            className={clsx(
                isPlain
                    ? compact
                        ? "inline-flex items-center justify-center p-0 text-xs"
                        : "inline-flex items-center justify-center p-0 text-xs"
                    : compact
                        ? "inline-flex h-8 w-8 items-center justify-center rounded-full border border-zinc-200/80 bg-white/90 p-0 dark:border-white/10 dark:bg-white/5"
                        : "inline-flex h-9 w-9 cursor-default items-center justify-center rounded-lg border border-zinc-200/80 bg-zinc-50/80 p-0 text-sm transition hover:bg-zinc-100 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10 sm:h-auto sm:w-auto sm:gap-1.5 sm:px-3 sm:py-2",
                isPlain
                    ? favorited
                        ? "text-red-500 font-bold"
                        : "text-gray-400 hover:text-red-400 dark:text-gray-300 dark:hover:text-red-500"
                    : favorited
                        ? "border-red-200/90 text-red-500 hover:bg-red-50 dark:border-red-400/30 dark:text-red-500 dark:hover:bg-red-500/10"
                        : "text-zinc-500 hover:text-red-500 dark:text-gray-300 dark:hover:text-red-400",
                disabled && "pointer-events-none opacity-60",
                `transition-none sm:transition-all ${isPlain ? "sm:duration-200" : "sm:duration-300"} ease-out`,
                className
            )}
        >
            <Heart
                size={18}
                className={clsx(
                    `transition-none sm:transition-all ${isPlain ? "sm:duration-200" : "sm:duration-300"}`,
                    favorited && "fill-current"
                )}
            />
            {!iconOnly && (
                <span className="hidden sm:inline">{favorited ? "Favorited" : "Favorite"}</span>
            )}
        </button>
    );
}
