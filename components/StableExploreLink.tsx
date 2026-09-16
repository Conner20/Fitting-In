"use client";

import Link from "next/link";
import type { ReactNode, SyntheticEvent } from "react";

const MOBILE_GREEN = "#22c55e";
const MOBILE_TEXT = "#111411";

function preserveGreenColors(event: SyntheticEvent<HTMLAnchorElement>) {
    const link = event.currentTarget;
    link.style.setProperty("-webkit-tap-highlight-color", "transparent", "important");
    link.style.setProperty("background", MOBILE_GREEN, "important");
    link.style.setProperty("background-color", MOBILE_GREEN, "important");
    link.style.setProperty("background-image", "none", "important");
    link.style.setProperty("border-color", MOBILE_GREEN, "important");
    link.style.setProperty("color", MOBILE_TEXT, "important");
    link.style.setProperty("-webkit-text-fill-color", MOBILE_TEXT, "important");
    link.style.setProperty("filter", "none", "important");
    link.style.setProperty("opacity", "1", "important");
}

export default function StableExploreLink({ className, href = "/", children = "Explore Fitting In" }: { className: string; href?: string; children?: ReactNode }) {
    return (
        <Link
            href={href}
            className={className}
            style={{ backgroundColor: MOBILE_GREEN, color: MOBILE_TEXT }}
            onPointerDownCapture={preserveGreenColors}
            onTouchStartCapture={preserveGreenColors}
            onMouseDownCapture={preserveGreenColors}
            onFocus={preserveGreenColors}
            onClickCapture={preserveGreenColors}
        >
            {children}
        </Link>
    );
}
