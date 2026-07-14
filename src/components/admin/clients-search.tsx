"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, X } from "lucide-react";

type Props = {
    initialQ?: string;
};

export default function ClientsSearch({ initialQ = "" }: Props) {
    const router = useRouter();
    const pathname = usePathname();

    const [isPending, startTransition] = useTransition();
    const [value, setValue] = useState(initialQ);

    useEffect(() => {
        setValue(initialQ);
    }, [initialQ]);

    const debouncedValue = useDebounced(value, 300);

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);

        const q = debouncedValue.trim();

        if (q) {
            params.set("q", q);
        } else {
            params.delete("q");
        }

        startTransition(() => {
            router.replace(`${pathname}${params.toString() ? `?${params}` : ""}`);
        });
    }, [debouncedValue, pathname, router]);

    const showClear = useMemo(() => value.trim().length > 0, [value]);

    function clear() {
        setValue("");

        const params = new URLSearchParams(window.location.search);
        params.delete("q");

        startTransition(() => {
            router.replace(`${pathname}${params.toString() ? `?${params}` : ""}`);
        });
    }

    return (
        <>
            {isPending && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/35 backdrop-blur-[2px]">
                    <div className="flex items-center gap-3 rounded-2xl border border-white/15 bg-slate-950/85 px-5 py-4 text-white shadow-2xl">
                        <Loader2 className="h-5 w-5 animate-spin text-cyan-300" />
                        <div className="text-sm font-medium">
                            Loading clients...
                        </div>
                    </div>
                </div>
            )}

            <div className="flex items-center gap-2">
                <div className="relative w-[320px] max-w-[55vw]">
                    <Input
                        value={value}
                        onChange={(e) => setValue(e.target.value)}
                        placeholder="Search clients..."
                        className="pr-10 transition focus-visible:ring-2 focus-visible:ring-cyan-400/60"
                    />

                    {showClear && (
                        <button
                            type="button"
                            onClick={clear}
                            disabled={isPending}
                            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground hover:bg-cyan-50 hover:text-cyan-700"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    )}
                </div>

                <Button
                    type="button"
                    variant="outline"
                    onClick={clear}
                    disabled={isPending}
                    className="hidden sm:inline-flex"
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