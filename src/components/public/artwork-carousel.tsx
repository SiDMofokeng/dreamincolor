"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";

type ArtworkSlide = {
    id: string;
    title: string;
    image_url: string;
};

type Props = {
    slides: ArtworkSlide[];
};

export default function ArtworkCarousel({ slides }: Props) {
    const [open, setOpen] = useState(false);
    const [activeIndex, setActiveIndex] = useState(0);

    const safeSlides = useMemo(() => slides.filter((x) => !!x.image_url), [slides]);
    const total = safeSlides.length;

    function openAt(index: number) {
        setActiveIndex(index);
        setOpen(true);
    }

    function closeModal() {
        setOpen(false);
    }

    function goPrev() {
        if (total === 0) return;
        setActiveIndex((prev) => (prev === 0 ? total - 1 : prev - 1));
    }

    function goNext() {
        if (total === 0) return;
        setActiveIndex((prev) => (prev === total - 1 ? 0 : prev + 1));
    }

    useEffect(() => {
        if (!open) return;

        function onKeyDown(e: KeyboardEvent) {
            if (e.key === "Escape") closeModal();
            if (e.key === "ArrowLeft") goPrev();
            if (e.key === "ArrowRight") goNext();
        }

        document.addEventListener("keydown", onKeyDown);
        document.body.style.overflow = "hidden";

        return () => {
            document.removeEventListener("keydown", onKeyDown);
            document.body.style.overflow = "";
        };
    }, [open, total]);

    if (safeSlides.length === 0) {
        return (
            <div className="p-8 text-sm text-muted-foreground">
                No artwork published yet.
            </div>
        );
    }

    const active = safeSlides[activeIndex];

    return (
        <>
            <div className="relative">
                <div
                    className="flex w-max gap-4 p-4"
                    style={{
                        animation: open ? "none" : "dic-carousel-scroll 45s linear infinite",
                    }}
                >
                    {[...safeSlides, ...safeSlides].map((slide, index) => {
                        const originalIndex = index % safeSlides.length;

                        return (
                            <button
                                key={`${slide.id}-${index}`}
                                type="button"
                                onClick={() => openAt(originalIndex)}
                                className="w-[280px] shrink-0 overflow-hidden rounded-xl border bg-background text-left transition-transform hover:scale-[1.01]"
                            >
                                <div className="aspect-[4/3] w-full bg-muted/30">
                                    <img
                                        src={slide.image_url}
                                        alt={slide.title}
                                        className="h-full w-full object-cover"
                                    />
                                </div>

                                <div className="p-4">
                                    <div className="text-sm font-semibold">{slide.title}</div>
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>

            {open ? (
                <div className="fixed inset-0 z-[9999] bg-black/95">
                    <div className="flex h-full w-full flex-col">
                        <div className="flex items-center justify-between border-b border-white/10 px-4 py-3 text-white md:px-6">
                            <div className="min-w-0 pr-4">
                                <div className="truncate text-sm font-semibold md:text-base">
                                    {active.title}
                                </div>
                                <div className="mt-1 text-xs text-white/60 md:text-sm">
                                    {activeIndex + 1} of {total}
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={goPrev}
                                    className="h-8 border-white/15 bg-transparent px-3 text-xs text-white hover:bg-white/10 hover:text-white"
                                >
                                    Prev
                                </Button>

                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={goNext}
                                    className="h-8 border-white/15 bg-transparent px-3 text-xs text-white hover:bg-white/10 hover:text-white"
                                >
                                    Next
                                </Button>

                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={closeModal}
                                    className="h-8 border-white/15 bg-transparent px-3 text-xs text-white hover:bg-white/10 hover:text-white"
                                >
                                    Close
                                </Button>
                            </div>
                        </div>

                        <div className="flex min-h-0 flex-1 flex-col bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.06),rgba(0,0,0,0.96)_60%)]">
                            <div className="relative flex min-h-0 flex-1 items-center justify-center px-6 py-6 md:px-10 md:py-8">
                                <button
                                    type="button"
                                    aria-label="Previous image"
                                    onClick={goPrev}
                                    className="absolute left-0 top-0 h-full w-1/2 cursor-w-resize bg-transparent"
                                />

                                <button
                                    type="button"
                                    aria-label="Next image"
                                    onClick={goNext}
                                    className="absolute right-0 top-0 h-full w-1/2 cursor-e-resize bg-transparent"
                                />

                                <img
                                    src={active.image_url}
                                    alt={active.title}
                                    className="relative z-10 max-h-full max-w-full rounded-md object-contain shadow-[0_20px_80px_rgba(0,0,0,0.55)]"
                                />

                                <button
                                    type="button"
                                    onClick={goPrev}
                                    className="absolute left-4 top-1/2 z-20 -translate-y-1/2 rounded-full border border-white/15 bg-black/45 px-3 py-2 text-sm text-white backdrop-blur-sm transition hover:bg-white/10"
                                >
                                    ←
                                </button>

                                <button
                                    type="button"
                                    onClick={goNext}
                                    className="absolute right-4 top-1/2 z-20 -translate-y-1/2 rounded-full border border-white/15 bg-black/45 px-3 py-2 text-sm text-white backdrop-blur-sm transition hover:bg-white/10"
                                >
                                    →
                                </button>
                            </div>

                            <div className="border-t border-white/10 bg-black/30 px-4 py-3 md:px-6">
                                <div className="flex gap-3 overflow-x-auto pb-1">
                                    {safeSlides.map((slide, index) => {
                                        const isActive = index === activeIndex;

                                        return (
                                            <button
                                                key={slide.id}
                                                type="button"
                                                onClick={() => setActiveIndex(index)}
                                                className={`shrink-0 overflow-hidden rounded-lg border transition ${isActive
                                                    ? "border-white ring-2 ring-white/25"
                                                    : "border-white/10 opacity-60 hover:opacity-100"
                                                    }`}
                                            >
                                                <div className="h-14 w-20 bg-white/5 md:h-16 md:w-24">
                                                    <img
                                                        src={slide.image_url}
                                                        alt={slide.title}
                                                        className="h-full w-full object-cover"
                                                    />
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            ) : null}
        </>
    );
}