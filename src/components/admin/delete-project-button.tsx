"use client";

import { ReactNode, useState } from "react";
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
    projectTitle: string;
    onDelete: () => Promise<{ ok: boolean; message?: string }>;
    trigger?: ReactNode;
};

export default function DeleteProjectButton({ projectTitle, onDelete, trigger }: Props) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);

    async function handleDelete() {
        setLoading(true);
        try {
            const res = await onDelete();
            if (!res.ok) {
                toast.error(res.message || "Failed to delete project.");
                return;
            }

            toast.success("Project deleted.");
            setOpen(false);
        } catch (e: any) {
            toast.error(e?.message || "Failed to delete project.");
        } finally {
            setLoading(false);
        }
    }

    return (
        <AlertDialog open={open} onOpenChange={setOpen}>
            <AlertDialogTrigger asChild>
                {trigger ?? <Button variant="destructive">Delete</Button>}
            </AlertDialogTrigger>

            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Delete project?</AlertDialogTitle>
                    <AlertDialogDescription>
                        This will permanently delete <span className="font-medium">{projectTitle}</span>.
                        Linked invoices will keep working (their project link will be set to null).
                    </AlertDialogDescription>
                </AlertDialogHeader>

                <AlertDialogFooter>
                    <AlertDialogCancel disabled={loading} className="cursor-pointer">
                        Cancel
                    </AlertDialogCancel>
                    <AlertDialogAction
                        onClick={handleDelete}
                        disabled={loading}
                        className="cursor-pointer"
                    >
                        {loading ? "Deleting..." : "Delete"}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}