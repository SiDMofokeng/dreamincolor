"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

type Props = {
    invoiceNumber: string;
    successHref?: string;
    trigger?: React.ReactNode;
    onDelete: () => Promise<{ ok: boolean; message?: string }>;
};

export default function DeleteInvoiceButton({
    invoiceNumber,
    successHref,
    trigger,
    onDelete,
}: Props) {
    const router = useRouter();

    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);

    async function handleDelete() {
        setLoading(true);

        try {
            const res = await onDelete();

            if (!res.ok) {
                toast.error(res.message || "Failed to delete invoice.");
                return;
            }

            toast.success("Invoice deleted.");

            setOpen(false);

            if (successHref) {
                router.push(successHref);
            } else {
                router.refresh();
            }

        } catch (e: any) {
            toast.error(e?.message || "Failed to delete invoice.");
        } finally {
            setLoading(false);
        }
    }

    return (
        <AlertDialog open={open} onOpenChange={setOpen}>

            <AlertDialogTrigger asChild>
    {trigger ?? (
        <Button variant="destructive">
            Delete
        </Button>
    )}
</AlertDialogTrigger>


            <AlertDialogContent>

                <AlertDialogHeader>

                    <AlertDialogTitle>
                        Delete invoice?
                    </AlertDialogTitle>

                    <AlertDialogDescription>
                        This will permanently delete invoice{" "}
                        <span className="font-medium">
                            {invoiceNumber}
                        </span>.
                        This cannot be undone.
                    </AlertDialogDescription>

                </AlertDialogHeader>


                <AlertDialogFooter>

                    <AlertDialogCancel disabled={loading}>
                        Cancel
                    </AlertDialogCancel>


                    <AlertDialogAction
                        onClick={handleDelete}
                        disabled={loading}
                    >
                        {loading ? "Deleting..." : "Delete"}
                    </AlertDialogAction>

                </AlertDialogFooter>

            </AlertDialogContent>

        </AlertDialog>
    );
}