"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

type Props = {
    projectId: string;
    currentStatus: string;
    onUpdate: (formData: FormData) => Promise<{ ok: boolean; message?: string }>;
};

function normalizeStatus(status: string | null | undefined) {
    return String(status ?? "").trim().toLowerCase();
}

function getStatusClasses(status: string) {
    switch (normalizeStatus(status)) {
        case "lead":
            return "border-slate-300 bg-slate-50 text-slate-700";
        case "onboarding":
            return "border-cyan-300 bg-cyan-50 text-cyan-700";
        case "in-progress":
            return "border-blue-300 bg-blue-50 text-blue-700";
        case "review":
            return "border-amber-300 bg-amber-50 text-amber-700";
        case "blocked":
            return "border-red-300 bg-red-50 text-red-700";
        case "done":
            return "border-emerald-300 bg-emerald-50 text-emerald-700";
        default:
            return "border-slate-300 bg-white text-slate-700";
    }
}

export default function ProjectStatusSelect({ projectId, currentStatus, onUpdate }: Props) {
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
                formData.set("project_id", projectId);
                formData.set("status", normalized);

                const res = await onUpdate(formData);

                if (!res?.ok) {
                    setStatus(previous);
                    toast.error(res?.message || "Failed to update project status.");
                    return;
                }

                toast.success("Project status updated.");
                router.refresh();
            } catch (error: any) {
                setStatus(previous);
                toast.error(error?.message || "Failed to update project status.");
            }
        });
    }

    return (
        <select
            name="status"
            value={status}
            disabled={isPending}
            onChange={(e) => handleChange(e.target.value)}
            className={`h-9 rounded-md border px-3 text-sm transition cursor-pointer ${getStatusClasses(status)} ${isPending ? "cursor-not-allowed opacity-80" : ""}`}
        >
            <option value="lead">Lead</option>
            <option value="onboarding">Onboarding</option>
            <option value="in-progress">In Progress</option>
            <option value="review">Review</option>
            <option value="blocked">Blocked</option>
            <option value="done">Done</option>
        </select>
    );
}