// FILE: src/components/public/lead-form.tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export default function LeadForm() {
    const [loading, setLoading] = useState(false);
    const [done, setDone] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setError(null);
        setLoading(true);

        const form = new FormData(e.currentTarget);
        const payload = {
            name: String(form.get("name") ?? ""),
            email: String(form.get("email") ?? ""),
            phone: String(form.get("phone") ?? ""),
            message: String(form.get("message") ?? ""),
            source: "landing",
        };

        try {
            const res = await fetch("/api/leads", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            const data = await res.json().catch(() => ({}));
            if (!res.ok || !data?.ok) {
                setError(data?.message || "Failed to send. Try again.");
                return;
            }

            setDone(true);
            (e.target as HTMLFormElement).reset();
        } catch {
            setError("Failed to send. Check your connection and try again.");
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="rounded-xl border bg-background p-5">
            <div className="text-sm font-semibold">Request a quote</div>
            <div className="mt-1 text-sm text-muted-foreground">
                Tell us what you need — we’ll respond with next steps.
            </div>

            {done ? (
                <div className="mt-4 rounded-lg border bg-muted/30 p-4 text-sm">
                    ✅ Thanks! Your message was sent.
                </div>
            ) : null}

            {error ? (
                <div className="mt-4 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                    {error}
                </div>
            ) : null}

            <form onSubmit={onSubmit} className="mt-4 space-y-3">
                <Input name="name" placeholder="Your name" required />
                <Input name="email" type="email" placeholder="Email address" required />
                <Input name="phone" placeholder="Phone (optional)" />
                <Textarea name="message" placeholder="What do you want to build?" rows={5} required />
                <Button type="submit" disabled={loading} className="w-full">
                    {loading ? "Sending..." : "Send"}
                </Button>
            </form>
        </div>
    );
}