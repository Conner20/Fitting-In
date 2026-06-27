// app/settings/privacy-toggle.tsx
'use client';

import { useEffect, useState } from "react";

export default function PrivacyToggle() {
    const [isPrivate, setIsPrivate] = useState<boolean | null>(null);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        (async () => {
            const res = await fetch("/api/user/privacy");
            if (res.ok) {
                const data = await res.json();
                setIsPrivate(!!data.isPrivate);
            }
        })();
    }, []);

    const toggle = async () => {
        if (isPrivate === null) return;
        setSaving(true);
        try {
            const res = await fetch("/api/user/privacy", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ isPrivate: !isPrivate }),
            });
            if (res.ok) {
                const data = await res.json();
                setIsPrivate(!!data.isPrivate);
            }
        } finally {
            setSaving(false);
        }
    };

    const buttonClass =
        "inline-flex min-w-[96px] items-center justify-center rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 transition hover:bg-black hover:text-white disabled:opacity-50 dark:border-white/20 dark:text-white dark:hover:bg-white/10";

    return (
        <div className="flex items-center">
            <button
                onClick={toggle}
                disabled={saving || isPrivate === null}
                className={buttonClass}
                title="Toggle public/private"
            >
                {isPrivate ? "Private" : "Public"}
            </button>
        </div>
    );
}
