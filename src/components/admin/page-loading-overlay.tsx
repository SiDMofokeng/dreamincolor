"use client";

import { useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

export default function PageLoadingOverlay() {
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const handleClick = (e: MouseEvent) => {
            const target = e.target as HTMLElement;

            const link = target.closest("a");
            if (link) {
                setLoading(true);
            }
        };

        const handleSubmit = () => {
            setLoading(true);
        };

        document.addEventListener("click", handleClick);
        document.addEventListener("submit", handleSubmit);

        return () => {
            document.removeEventListener("click", handleClick);
            document.removeEventListener("submit", handleSubmit);
        };
    }, []);

    useEffect(() => {
        const t = setTimeout(() => {
            setLoading(false);
        }, 400);

        return () => clearTimeout(t);
    }, [pathname, searchParams]);

    if (!loading) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
            <div className="rounded-xl bg-white px-6 py-4 shadow-xl flex items-center gap-3">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-fuchsia-500 border-r-purple-600 border-b-cyan-500 border-t-transparent" />
                <span className="text-sm font-medium text-slate-700">
                    Loading...
                </span>
            </div>
        </div>
    );
}