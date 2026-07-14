"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

type Props = {
    projectId: string;
    currentPriority: string;
    onUpdate: (formData: FormData) => Promise<{ ok: boolean; message?: string }>;
};

function normalizePriority(priority: string | null | undefined) {
    return String(priority ?? "").trim().toLowerCase();
}

function getPriorityClasses(priority: string) {
    switch (normalizePriority(priority)) {
        case "low":
            return "border-emerald-300 bg-emerald-50 text-emerald-700";
        case "medium":
            return "border-amber-300 bg-amber-50 text-amber-700";
        case "high":
            return "border-red-300 bg-red-50 text-red-700";
        default:
            return "border-slate-300 bg-white text-slate-700";
    }
}

export default function ProjectPrioritySelect({ projectId, currentPriority, onUpdate }: Props) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const [priority, setPriority] = useState(normalizePriority(currentPriority));

    useEffect(() => {
        setPriority(normalizePriority(currentPriority));
    }, [currentPriority]);

    function handleChange(nextPriority: string) {
        const previous = priority;
        const normalized = normalizePriority(nextPriority);

        setPriority(normalized);

        startTransition(async () => {
            try {
                const formData = new FormData();
                formData.set("project_id", projectId);
                formData.set("priority", normalized);

                const res = await onUpdate(formData);

                if (!res?.ok) {
                    setPriority(previous);
                    toast.error(res?.message || "Failed to update project priority.");
                    return;
                }

                toast.success("Project priority updated.");
                router.refresh();
            } catch (error: any) {
                setPriority(previous);
                toast.error(error?.message || "Failed to update project priority.");
            }
        });
    }

    return (
        <select
            name="priority"
            value={priority}
            disabled={isPending}
            onChange={(e) => handleChange(e.target.value)}
            className={`h-9 rounded-md border px-3 text-sm transition cursor-pointer ${getPriorityClasses(priority)} ${isPending ? "cursor-not-allowed opacity-80" : ""}`}
        >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
        </select>
    );
}