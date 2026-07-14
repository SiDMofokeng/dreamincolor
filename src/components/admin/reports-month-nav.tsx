// FILE: src/components/admin/reports-month-nav.tsx
"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

type ReportsMonthNavProps = {
    prevHref: string;
    currentHref: string;
    nextHref: string;
};

export default function ReportsMonthNav({
    prevHref,
    currentHref,
    nextHref,
}: ReportsMonthNavProps) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();

    function goTo(href: string) {
        startTransition(() => {
            router.push(href);
        });
    }

    return (
        <>
            {isPending ? (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/35 backdrop-blur-[2px]">
                    <div className="flex items-center gap-3 rounded-2xl border border-white/15 bg-slate-950/85 px-5 py-4 text-white shadow-2xl">
                        <Loader2 className="h-5 w-5 animate-spin text-cyan-300" />
                        <div className="text-sm font-medium">Loading report...</div>
                    </div>
                </div>
            ) : null}

            <div className="flex flex-wrap gap-2">
                <Button
                    type="button"
                    variant="outline"
                    disabled={isPending}
                    onClick={() => goTo(prevHref)}
                >
                    ← Previous
                </Button>

                <Button
                    type="button"
                    disabled={isPending}
                    className="border-0 bg-gradient-to-r from-fuchsia-500 to-purple-600 text-white hover:from-fuchsia-500/90 hover:to-purple-600/90"
                    onClick={() => goTo(currentHref)}
                >
                    Current
                </Button>

                <Button
                    type="button"
                    variant="outline"
                    disabled={isPending}
                    onClick={() => goTo(nextHref)}
                >
                    Next →
                </Button>
            </div>
        </>
    );
}