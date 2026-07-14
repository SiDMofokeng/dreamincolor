"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

type Props = {
    clientId: string;
    currentStatus: string;
    onUpdate: (formData: FormData) => Promise<{ ok: boolean; message?: string }>;
};

function normalizeStatus(status: string | null | undefined) {
    return String(status ?? "").trim().toLowerCase();
}

function selectClass(status: string) {
    const base =
        "h-9 min-w-[120px] rounded-md border px-3 text-sm transition focus:outline-none focus:ring-2 disabled:cursor-not-allowed disabled:opacity-70";

    if (status === "active") {
        return `${base} cursor-pointer border-emerald-200 bg-emerald-50 text-emerald-700 hover:border-emerald-300 focus:ring-emerald-200`;
    }

    if (status === "inactive") {
        return `${base} cursor-pointer border-red-200 bg-red-50 text-red-700 hover:border-red-300 focus:ring-red-200`;
    }

    return `${base} cursor-pointer border-slate-200 bg-white text-slate-700 hover:border-cyan-300 focus:ring-cyan-200`;
}

export default function ClientStatusSelect({ clientId, currentStatus, onUpdate }: Props) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const [status, setStatus] = useState(normalizeStatus(currentStatus));

    useEffect(() => {
        setStatus(normalizeStatus(currentStatus));
    }, [currentStatus]);

    function handleChange(nextStatus: string) {
        const previous = status;
        const normalized = normalizeStatus(nextStatus);

        setStatus(normalized);

        startTransition(async () => {
            try {
                const formData = new FormData();
                formData.set("client_id", clientId);
                formData.set("status", normalized);

                const res = await onUpdate(formData);

                if (!res?.ok) {
                    setStatus(previous);
                    toast.error(res?.message || "Failed to update client status.");
                    return;
                }

                toast.success("Client status updated.");
                router.refresh();
            } catch (error: any) {
                setStatus(previous);
                toast.error(error?.message || "Failed to update client status.");
            }
        });
    }

    return (
        <select
            name="status"
            value={status}
            disabled={isPending}
            onChange={(e) => handleChange(e.target.value)}
            className={selectClass(status)}
            aria-label="Client status"
        >
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
        </select>
    );
}