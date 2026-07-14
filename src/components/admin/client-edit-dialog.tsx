"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";

type ClientEditDialogProps = {
    open: boolean;
    closeHref: string;
    client: {
        id: string;
        name: string;
        contact_person: string | null;
        email: string | null;
        phone: string | null;
        notes: string | null;
        status: string;
        created_at: string;
    };
    onSave: (formData: FormData) => Promise<{ ok: boolean; message?: string }>;
};

export default function ClientEditDialog({
    open,
    closeHref,
    client,
    onSave,
}: ClientEditDialogProps) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);

    function handleClose(nextOpen: boolean) {
        if (!nextOpen && !loading) {
            router.push(closeHref);
        }
    }

    async function handleSubmit(formData: FormData) {
        setLoading(true);

        try {
            const res = await onSave(formData);

            if (!res?.ok) {
                toast.error(res?.message || "Failed to update client.");
                return;
            }

            toast.success("Client updated.");
            router.push(closeHref);
            router.refresh();
        } catch (e: any) {
            toast.error(e?.message || "Failed to update client.");
        } finally {
            setLoading(false);
        }
    }

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Edit Client</DialogTitle>
                    <DialogDescription>
                        Update contact info and notes for {client.name}.
                    </DialogDescription>
                </DialogHeader>

                <form action={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="edit_name">Client / Company Name</Label>
                        <Input
                            id="edit_name"
                            name="name"
                            defaultValue={client.name}
                            required
                        />
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                            <Label htmlFor="edit_contact_person">Contact Person</Label>
                            <Input
                                id="edit_contact_person"
                                name="contact_person"
                                defaultValue={client.contact_person ?? ""}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="edit_phone">Phone</Label>
                            <Input
                                id="edit_phone"
                                name="phone"
                                defaultValue={client.phone ?? ""}
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="edit_email">Email</Label>
                        <Input
                            id="edit_email"
                            name="email"
                            type="email"
                            defaultValue={client.email ?? ""}
                        />
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                            <Label htmlFor="edit_status">Status</Label>
                            <Input
                                id="edit_status"
                                name="status"
                                defaultValue={client.status ?? "active"}
                            />
                            <div className="text-xs text-muted-foreground">
                                For now: type <span className="font-medium">active</span> or{" "}
                                <span className="font-medium">inactive</span>.
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>Created</Label>
                            <Input
                                value={new Date(client.created_at).toLocaleString("en-ZA")}
                                readOnly
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="edit_notes">Notes</Label>
                        <Textarea
                            id="edit_notes"
                            name="notes"
                            defaultValue={client.notes ?? ""}
                            rows={5}
                        />
                    </div>

                    <div className="flex flex-wrap gap-2">
                        <Button
                            type="submit"
                            disabled={loading}
                            className="cursor-pointer border-0 bg-gradient-to-r from-fuchsia-500 to-purple-600 text-white hover:from-fuchsia-500/90 hover:to-purple-600/90 disabled:cursor-not-allowed"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Saving...
                                </>
                            ) : (
                                <>
                                    <Save className="mr-2 h-4 w-4" />
                                    Save Changes
                                </>
                            )}
                        </Button>

                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => router.push(closeHref)}
                            disabled={loading}
                            className="cursor-pointer disabled:cursor-not-allowed"
                        >
                            Cancel
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}