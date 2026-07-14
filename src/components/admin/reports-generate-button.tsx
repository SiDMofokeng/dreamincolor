// FILE: src/components/admin/reports-generate-button.tsx
"use client";

import { useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

type ReportsGenerateButtonProps = {
    isClosed: boolean;
};

export default function ReportsGenerateButton({ isClosed }: ReportsGenerateButtonProps) {
    const { pending } = useFormStatus();
    const wasPending = useRef(false);

    useEffect(() => {
        if (pending && !wasPending.current) {
            toast.loading(
                isClosed ? "Regenerating report snapshot..." : "Generating monthly report...",
                { id: "reports-generate" }
            );
        }

        if (!pending && wasPending.current) {
            toast.success(
                isClosed ? "Report snapshot regenerated." : "Monthly report generated.",
                { id: "reports-generate" }
            );
        }

        wasPending.current = pending;
    }, [pending, isClosed]);

    return (
        <Button
            type="submit"
            disabled={pending}
            className="border-0 bg-gradient-to-r from-cyan-500 to-blue-600 text-white hover:from-cyan-500/90 hover:to-blue-600/90 disabled:opacity-80"
        >
            {pending ? (
                <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {isClosed ? "Regenerating..." : "Generating..."}
                </>
            ) : (
                <>{isClosed ? "Regenerate snapshot" : "Generate monthly report"}</>
            )}
        </Button>
    );
}