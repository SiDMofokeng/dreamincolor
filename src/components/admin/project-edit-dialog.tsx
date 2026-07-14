"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type ProjectEditDialogProps = {
    open: boolean;
    closeHref: string;
    project: {
        id: string;
        title: string;
        description: string | null;
        status: string;
        priority: string;
        start_date: string | null;
        due_date: string | null;
        internal_notes: string | null;
        completed_at: string | null;
        created_at: string;
    };
    onSave: (formData: FormData) => Promise<{ ok: boolean; message?: string }>;
};

export default function ProjectEditDialog({
    open,
    closeHref,
    project,
    onSave,
}: ProjectEditDialogProps) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);

    async function handleSubmit(formData: FormData) {
        setLoading(true);

        try {
            const res = await onSave(formData);

            if (!res.ok) {
                toast.error(res.message || "Failed to update project.");
                return;
            }

            toast.success("Project updated.");
            router.replace(closeHref);
            router.refresh();
        } catch (e: any) {
            toast.error(e?.message || "Failed to update project.");
        } finally {
            setLoading(false);
        }
    }

    return (
        <Dialog
            open={open}
            onOpenChange={(nextOpen) => {
                if (!nextOpen) router.replace(closeHref);
            }}
        >
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Edit Project</DialogTitle>
                    <DialogDescription>
                        Update project details without leaving the list.
                    </DialogDescription>
                </DialogHeader>

                <form action={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="title">Title</Label>
                        <Input id="title" name="title" defaultValue={project.title} required />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="description">Description</Label>
                        <Textarea
                            id="description"
                            name="description"
                            defaultValue={project.description ?? ""}
                            rows={4}
                        />
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                            <Label htmlFor="status">Status</Label>
                            <select
                                id="status"
                                name="status"
                                defaultValue={project.status ?? "in-progress"}
                                className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                            >
                                <option value="lead">Lead</option>
                                <option value="onboarding">Onboarding</option>
                                <option value="in-progress">In Progress</option>
                                <option value="review">Review</option>
                                <option value="blocked">Blocked</option>
                                <option value="done">Done</option>
                            </select>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="priority">Priority</Label>
                            <select
                                id="priority"
                                name="priority"
                                defaultValue={project.priority ?? "medium"}
                                className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                            >
                                <option value="low">Low</option>
                                <option value="medium">Medium</option>
                                <option value="high">High</option>
                            </select>
                        </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                            <Label htmlFor="start_date">Start Date</Label>
                            <Input
                                id="start_date"
                                name="start_date"
                                type="date"
                                defaultValue={project.start_date ?? ""}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="due_date">Due Date</Label>
                            <Input
                                id="due_date"
                                name="due_date"
                                type="date"
                                defaultValue={project.due_date ?? ""}
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>Completed At</Label>
                        <Input
                            value={
                                project.completed_at
                                    ? new Date(project.completed_at).toLocaleString("en-ZA")
                                    : ""
                            }
                            readOnly
                            placeholder="Will populate when status becomes done"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="internal_notes">Internal Notes</Label>
                        <Textarea
                            id="internal_notes"
                            name="internal_notes"
                            defaultValue={project.internal_notes ?? ""}
                            rows={4}
                        />
                    </div>

                    <div className="flex flex-wrap gap-2">
                        <Button
                            type="submit"
                            disabled={loading}
                            className="cursor-pointer border-0 bg-gradient-to-r from-fuchsia-500 to-purple-600 text-white transition hover:from-fuchsia-500/90 hover:to-purple-600/90 disabled:cursor-not-allowed"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Saving...
                                </>
                            ) : (
                                "Save Changes"
                            )}
                        </Button>

                        <Button asChild type="button" variant="outline" className="cursor-pointer">
                            <Link href={closeHref}>Cancel</Link>
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}