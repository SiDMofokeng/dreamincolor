"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, X } from "lucide-react";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

type Props = {
    initialQ?: string;
    initialStatus?: string;
};

export default function ProjectsFilters({ initialQ = "", initialStatus = "all" }: Props) {
    const router = useRouter();
    const pathname = usePathname();
    const sp = useSearchParams();
    const [isPending, startTransition] = useTransition();

    const [q, setQ] = useState(initialQ);
    const [status, setStatus] = useState(initialStatus || "all");

    useEffect(() => setQ(initialQ), [initialQ]);
    useEffect(() => setStatus(initialStatus || "all"), [initialStatus]);

    const debouncedQ = useDebounced(q, 300);

    useEffect(() => {
        const params = new URLSearchParams(sp.toString());

        const nextQ = debouncedQ.trim();
        if (nextQ) params.set("q", nextQ);
        else params.delete("q");

        if (status && status !== "all") params.set("status", status);
        else params.delete("status");

        const next = params.toString();
        if (next === sp.toString()) return;

        startTransition(() => {
            router.replace(`${pathname}${next ? `?${next}` : ""}`);
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [debouncedQ, status]);

    const showClear = useMemo(
        () => q.trim().length > 0 || (status && status !== "all"),
        [q, status]
    );

    function clearAll() {
        setQ("");
        setStatus("all");

        const params = new URLSearchParams(sp.toString());
        params.delete("q");
        params.delete("status");

        startTransition(() => {
            router.replace(`${pathname}${params.toString() ? `?${params}` : ""}`);
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

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <div className="relative w-[320px] max-w-[55vw]">
                    <Input
                        value={q}
                        onChange={(e) => setQ(e.target.value)}
                        placeholder="Search projects..."
                        className="pr-10"
                    />
                    {q.trim() ? (
                        <button
                            type="button"
                            onClick={() => setQ("")}
                            className="absolute right-2 top-1/2 -translate-y-1/2 cursor-pointer rounded-md p-1 text-muted-foreground transition hover:bg-accent hover:text-accent-foreground"
                            aria-label="Clear search"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    ) : null}
                </div>

                <div className="w-[200px]">
                    <Select value={status} onValueChange={setStatus}>
                        <SelectTrigger className="cursor-pointer">
                            <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All statuses</SelectItem>
                            <SelectItem value="lead">Lead</SelectItem>
                            <SelectItem value="onboarding">Onboarding</SelectItem>
                            <SelectItem value="in-progress">In Progress</SelectItem>
                            <SelectItem value="review">Review</SelectItem>
                            <SelectItem value="blocked">Blocked</SelectItem>
                            <SelectItem value="done">Done</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <Button
                    variant="outline"
                    onClick={clearAll}
                    disabled={!showClear || isPending}
                    className="cursor-pointer bg-white text-black transition hover:bg-slate-100 disabled:cursor-not-allowed sm:ml-1"
                >
                    Clear
                </Button>
            </div>
        </>
    );
}

function useDebounced<T>(value: T, delayMs: number) {
    const [debounced, setDebounced] = useState(value);

    useEffect(() => {
        const t = setTimeout(() => setDebounced(value), delayMs);
        return () => clearTimeout(t);
    }, [value, delayMs]);

    return debounced;
}