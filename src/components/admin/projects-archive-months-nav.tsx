"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type ArchiveMonthItem = {
    href: string;
    label: string;
    active: boolean;
};

type ProjectsArchiveMonthsNavProps = {
    months: ArchiveMonthItem[];
};

export default function ProjectsArchiveMonthsNav({
    months,
}: ProjectsArchiveMonthsNavProps) {
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
                        <div className="text-sm font-medium">Loading projects...</div>
                    </div>
                </div>
            ) : null}

            <div className="flex flex-wrap gap-2">
                {months.length === 0 ? (
                    <Badge variant="outline">No archived months yet</Badge>
                ) : (
                    months.map((m) => (
                        <Button
                            key={m.href}
                            type="button"
                            size="sm"
                            variant={m.active ? "default" : "outline"}
                            disabled={isPending}
                            className={
                                m.active
                                    ? "border-0 bg-gradient-to-r from-cyan-500 to-blue-600 text-white hover:from-cyan-500/90 hover:to-blue-600/90"
                                    : ""
                            }
                            onClick={() => goTo(m.href)}
                        >
                            {m.label}
                        </Button>
                    ))
                )}
            </div>
        </>
    );
}