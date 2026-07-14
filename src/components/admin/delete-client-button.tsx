"use client";

import { useState, type ReactNode } from "react";
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
    clientName: string;
    onDelete: () => Promise<{ ok: boolean; message?: string }>;
    trigger?: ReactNode;
};

export default function DeleteClientButton({ clientName, onDelete, trigger }: Props) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);

    async function handleDelete() {
        setLoading(true);

        try {
            const res = await onDelete();

            if (!res.ok) {
                toast.error(res.message || "Failed to delete client.");
                return;
            }

            toast.success("Client deleted.");
            setOpen(false);
        } catch (e: any) {
            toast.error(e?.message || "Failed to delete client.");
        } finally {
            setLoading(false);
        }
    }

    return (
        <AlertDialog open={open} onOpenChange={setOpen}>
            <AlertDialogTrigger asChild>
                {trigger ?? (
                    <Button variant="destructive" className="cursor-pointer disabled:cursor-not-allowed">
                        Delete
                    </Button>
                )}
            </AlertDialogTrigger>

            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Delete client?</AlertDialogTitle>
                    <AlertDialogDescription>
                        This will permanently delete <span className="font-medium">{clientName}</span> and
                        remove related projects and invoices (cascade). This cannot be undone.
                    </AlertDialogDescription>
                </AlertDialogHeader>

                <AlertDialogFooter>
                    <AlertDialogCancel className="cursor-pointer" disabled={loading}>
                        Cancel
                    </AlertDialogCancel>
                    <AlertDialogAction
                        onClick={handleDelete}
                        disabled={loading}
                        className="cursor-pointer disabled:cursor-not-allowed"
                    >
                        {loading ? "Deleting..." : "Delete"}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}