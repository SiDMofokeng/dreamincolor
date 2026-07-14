// FILE: src/components/admin/settings-submit-button.tsx
"use client";

import { useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import { Save, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export default function SettingsSubmitButton() {
    const { pending } = useFormStatus();
    const wasPending = useRef(false);

    useEffect(() => {
        if (pending && !wasPending.current) {
            toast.loading("Saving company settings...", {
                id: "settings-save",
            });
        }

        if (!pending && wasPending.current) {
            toast.success("Company settings saved.", {
                id: "settings-save",
            });
        }

        wasPending.current = pending;
    }, [pending]);

    return (
        <Button
            type="submit"
            disabled={pending}
            className="border-0 bg-gradient-to-r from-fuchsia-500 to-purple-600 text-white hover:from-fuchsia-500 hover:to-purple-600 disabled:opacity-80"
        >
            {pending ? (
                <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                </>
            ) : (
                <>
                    <Save className="mr-2 h-4 w-4" />
                    Save
                </>
            )}
        </Button>
    );
}
