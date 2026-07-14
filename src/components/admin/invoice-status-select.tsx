"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

type Props = {
    invoiceId: string;
    currentStatus: string;
    onUpdate: (formData: FormData) => Promise<{ ok: boolean; message?: string }>;
};

function normalizeStatus(status: string | null | undefined) {
    return String(status ?? "").trim().toLowerCase();
}

function statusClasses(status: string) {
    const s = normalizeStatus(status);

    if (s === "paid") {
        return "border-emerald-200 bg-emerald-50 text-emerald-700 hover:border-emerald-300";
    }

    if (s === "overdue") {
        return "border-red-200 bg-red-50 text-red-700 hover:border-red-300";
    }

    if (s === "cancelled") {
        return "border-slate-300 bg-slate-100 text-slate-600 hover:border-slate-400";
    }

    if (s === "sent") {
        return "border-cyan-200 bg-cyan-50 text-cyan-700 hover:border-cyan-300";
    }

    return "border-amber-200 bg-amber-50 text-amber-700 hover:border-amber-300";
}

export default function InvoiceStatusSelect({ invoiceId, currentStatus, onUpdate }: Props) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const [status, setStatus] = useState(normalizeStatus(currentStatus));

    useEffect(() => {
        setStatus(normalizeStatus(currentStatus));
    }, [currentStatus]);

    const selectClassName = useMemo(() => {
        return [
            "h-9 rounded-md border px-3 text-sm font-medium transition",
            "cursor-pointer disabled:cursor-not-allowed",
            "focus:outline-none focus:ring-2 focus:ring-slate-200",
            statusClasses(status),
        ].join(" ");
    }, [status]);

    function handleChange(nextStatus: string) {
        const previous = status;
        const normalized = normalizeStatus(nextStatus);

        setStatus(normalized);

        startTransition(async () => {
            try {
                const formData = new FormData();
                formData.set("invoice_id", invoiceId);
                formData.set("status", normalized);

                const res = await onUpdate(formData);

                if (!res?.ok) {
                    setStatus(previous);
                    toast.error(res?.message || "Failed to update invoice status.");
                    return;
                }

                toast.success("Invoice status updated.");
                router.refresh();
            } catch (error: any) {
                setStatus(previous);
                toast.error(error?.message || "Failed to update invoice status.");
            }
        });
    }

    return (
        <select
            name="status"
            value={status}
            disabled={isPending}
            onChange={(e) => handleChange(e.target.value)}
            className={selectClassName}
            aria-label="Invoice status"
        >
            <option value="draft">Draft</option>
            <option value="sent">Sent</option>
            <option value="paid">Paid</option>
            <option value="overdue">Overdue</option>
            <option value="cancelled">Cancelled</option>
        </select>
    );
}