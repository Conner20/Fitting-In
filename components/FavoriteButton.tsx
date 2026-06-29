'use client';

import clsx from "clsx";
import { Bookmark } from "lucide-react";

type FavoriteButtonProps = {
    favorited: boolean;
    onClick: () => void;
    animating?: boolean;
    iconOnly?: boolean;
    compact?: boolean;
    variant?: "plain" | "button";
    className?: string;
    labelClassName?: string;
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
    labelClassName,
    title,
    disabled = false,
}: FavoriteButtonProps) {
    const isPlain = variant === "plain";
    const stateLabel = favorited ? "Saved" : "Save";

    return (
        <button
            type="button"
            onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                onClick();
            }}
            disabled={disabled}
            title={stateLabel}
            aria-label={stateLabel}
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
                        ? "font-bold text-yellow-500"
                        : "text-gray-400 hover:text-yellow-500 dark:text-gray-300 dark:hover:text-yellow-400"
                    : favorited
                        ? "border-yellow-200/90 text-yellow-500 hover:bg-yellow-50 dark:border-yellow-400/30 dark:text-yellow-400 dark:hover:bg-yellow-500/10"
                        : "text-zinc-500 hover:text-yellow-500 dark:text-gray-300 dark:hover:text-yellow-400",
                disabled && "pointer-events-none opacity-60",
                `transition-none sm:transition-all ${isPlain ? "sm:duration-200" : "sm:duration-300"} ease-out`,
                className
            )}
        >
            <Bookmark
                size={18}
                className={clsx(
                    `transition-none sm:transition-all ${isPlain ? "sm:duration-200" : "sm:duration-300"}`,
                    favorited && "fill-current"
                )}
            />
            {!iconOnly && (
                <span className={labelClassName ?? "hidden sm:inline"}>{stateLabel}</span>
            )}
        </button>
    );
}
