// FILE: src/components/public/lead-form.tsx

"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type FormStatus =
    | {
          type: "success";
          message: string;
      }
    | {
          type: "warning";
          message: string;
      }
    | {
          type: "error";
          message: string;
      }
    | null;

export default function LeadForm() {
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState<FormStatus>(null);

    async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();

        // Save the form reference before the asynchronous request.
        const formElement = event.currentTarget;
        const formData = new FormData(formElement);

        setLoading(true);
        setStatus(null);

        const payload = {
            name: String(formData.get("name") ?? "").trim(),
            email: String(formData.get("email") ?? "").trim(),
            phone: String(formData.get("phone") ?? "").trim(),
            message: String(formData.get("message") ?? "").trim(),
            source: "landing",
        };

        try {
            const response = await fetch("/api/leads", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(payload),
            });

            const data = await response.json().catch(() => null);

            if (!response.ok || !data?.ok) {
                setStatus({
                    type: "error",
                    message:
                        "Sorry, we could not send your request. Please try again or contact us on WhatsApp.",
                });
                return;
            }

            formElement.reset();

            if (data.emailSent === false) {
                setStatus({
                    type: "warning",
                    message:
                        "Your request was received successfully. Our email notification is temporarily delayed, but your enquiry has been saved.",
                });
                return;
            }

            setStatus({
                type: "success",
                message:
                    "Thank you! Your message has been sent successfully. We’ll contact you shortly.",
            });
        } catch (error) {
            console.error("Lead form submission error:", error);

            setStatus({
                type: "error",
                message:
                    "Sorry, we could not send your request. Please check your connection and try again.",
            });
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-xl font-semibold text-slate-900">
                Request a Quote
            </h3>

            <p className="mt-2 text-sm text-slate-600">
                Tell us about your project and we&apos;ll get back to you shortly.
            </p>

            {status?.type === "success" ? (
                <div
                    role="status"
                    className="mt-5 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800"
                >
                    {status.message}
                </div>
            ) : null}

            {status?.type === "warning" ? (
                <div
                    role="status"
                    className="mt-5 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800"
                >
                    {status.message}
                </div>
            ) : null}

            {status?.type === "error" ? (
                <div
                    role="alert"
                    className="mt-5 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700"
                >
                    {status.message}
                </div>
            ) : null}

            <form onSubmit={onSubmit} className="mt-6 space-y-4">
                <Input
                    name="name"
                    autoComplete="name"
                    placeholder="Your name"
                    required
                    disabled={loading}
                    className="border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 disabled:opacity-60"
                />

                <Input
                    name="email"
                    type="email"
                    autoComplete="email"
                    placeholder="Email address"
                    required
                    disabled={loading}
                    className="border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 disabled:opacity-60"
                />

                <Input
                    name="phone"
                    type="tel"
                    autoComplete="tel"
                    placeholder="Phone number (optional)"
                    disabled={loading}
                    className="border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 disabled:opacity-60"
                />

                <Textarea
                    name="message"
                    placeholder="Tell us about your project..."
                    rows={6}
                    required
                    disabled={loading}
                    className="min-h-32 resize-y border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 disabled:opacity-60"
                />

                <Button
                    type="submit"
                    disabled={loading}
                    className="w-full"
                >
                    {loading ? "Sending..." : "Send Message"}
                </Button>
            </form>
        </div>
    );
}