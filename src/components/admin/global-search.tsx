// FILE: src/components/admin/global-search.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";

type SearchItem = {
    type: "client" | "project" | "invoice";
    title: string;
    subtitle?: string;
    href: string;
};

type Props = {
    placeholder?: string;
    className?: string;
};

function pillVariant(type: SearchItem["type"]) {
    if (type === "client") return "secondary";
    if (type === "project") return "outline";
    return "secondary";
}

export default function GlobalSearch({ placeholder = "Search...", className }: Props) {
    const router = useRouter();
    const [value, setValue] = useState("");
    const [items, setItems] = useState<SearchItem[]>([]);
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [activeIndex, setActiveIndex] = useState(0);

    const wrapRef = useRef<HTMLDivElement | null>(null);
    const abortRef = useRef<AbortController | null>(null);

    const debounced = useDebounced(value, 250);
    const canSearch = useMemo(() => debounced.trim().length >= 2, [debounced]);

    useEffect(() => {
        if (!canSearch) {
            setItems([]);
            setLoading(false);
            setOpen(false);
            return;
        }

        const q = debounced.trim();

        abortRef.current?.abort();
        const controller = new AbortController();
        abortRef.current = controller;

        setLoading(true);

        fetch(`/api/search?q=${encodeURIComponent(q)}`, { signal: controller.signal })
            .then(async (r) => {
                if (!r.ok) return { items: [] as SearchItem[] };
                return (await r.json()) as { items: SearchItem[] };
            })
            .then((data) => {
                setItems(data.items ?? []);
                setActiveIndex(0);
                setOpen(true);
            })
            .catch((e) => {
                if (e?.name === "AbortError") return;
                setItems([]);
                setOpen(false);
            })
            .finally(() => setLoading(false));
    }, [debounced, canSearch]);

    // Close on outside click
    useEffect(() => {
        function onDown(e: MouseEvent) {
            if (!wrapRef.current) return;
            if (!wrapRef.current.contains(e.target as Node)) setOpen(false);
        }
        document.addEventListener("mousedown", onDown);
        return () => document.removeEventListener("mousedown", onDown);
    }, []);

    function go(item: SearchItem) {
        setOpen(false);
        setValue("");
        router.push(item.href);
    }

    function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
        if (!open) return;

        if (e.key === "ArrowDown") {
            e.preventDefault();
            setActiveIndex((i) => Math.min(i + 1, items.length - 1));
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActiveIndex((i) => Math.max(i - 1, 0));
        } else if (e.key === "Enter") {
            e.preventDefault();
            const item = items[activeIndex];
            if (item) go(item);
        } else if (e.key === "Escape") {
            setOpen(false);
        }
    }

    return (
        <div ref={wrapRef} className={`relative ${className ?? ""}`}>
            <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
                value={value}
                onChange={(e) => setValue(e.target.value)}
                onFocus={() => {
                    if (items.length) setOpen(true);
                }}
                onKeyDown={onKeyDown}
                placeholder={placeholder}
                className="pl-9"
            />

            {open ? (
                <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-50 overflow-hidden rounded-lg border bg-background shadow-md">
                    <div className="px-3 py-2 text-xs text-muted-foreground">
                        {loading ? "Searching..." : items.length ? "Results" : "No results"}
                    </div>

                    <div className="max-h-[320px] overflow-auto">
                        {items.map((it, idx) => (
                            <button
                                key={`${it.type}-${it.href}`}
                                type="button"
                                onClick={() => go(it)}
                                className={`flex w-full items-start justify-between gap-3 px-3 py-2 text-left text-sm transition-colors ${idx === activeIndex ? "bg-accent/60" : "hover:bg-accent/40"
                                    }`}
                            >
                                <div className="min-w-0">
                                    <div className="truncate font-medium">{it.title}</div>
                                    {it.subtitle ? (
                                        <div className="mt-0.5 truncate text-xs text-muted-foreground">{it.subtitle}</div>
                                    ) : null}
                                </div>

                                <Badge variant={pillVariant(it.type)} className="shrink-0">
                                    {it.type}
                                </Badge>
                            </button>
                        ))}
                    </div>
                </div>
            ) : null}
        </div>
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