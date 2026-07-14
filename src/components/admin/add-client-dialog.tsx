"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";

type Props = {
    onCreate: (formData: FormData) => Promise<{ ok: boolean; message?: string }>;
};

export default function AddClientDialog({ onCreate }: Props) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);

    async function handleSubmit(formData: FormData) {
        setLoading(true);

        try {
            const res = await onCreate(formData);

            if (!res.ok) {
                toast.error(res.message || "Failed to create client.");
                return;
            }

            toast.success("Client created.");
            setOpen(false);
        } catch (e: any) {
            toast.error(e?.message || "Failed to create client.");
        } finally {
            setLoading(false);
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button
                    disabled={loading}
                    className="cursor-pointer transition hover:brightness-110 disabled:cursor-not-allowed"
                >
                    + Add Client
                </Button>
            </DialogTrigger>

            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>Add Client</DialogTitle>
                    <DialogDescription>
                        Create a client record for projects and invoices.
                    </DialogDescription>
                </DialogHeader>

                <form action={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="name">Client / Company Name</Label>
                        <Input
                            id="name"
                            name="name"
                            placeholder="e.g. ABC Holdings"
                            required
                            className="transition focus-visible:ring-2 focus-visible:ring-cyan-400/60"
                        />
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                            <Label htmlFor="contact_person">Contact Person</Label>
                            <Input
                                id="contact_person"
                                name="contact_person"
                                placeholder="e.g. Jane Doe"
                                className="transition focus-visible:ring-2 focus-visible:ring-cyan-400/60"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="phone">Phone</Label>
                            <Input
                                id="phone"
                                name="phone"
                                placeholder="e.g. +27..."
                                className="transition focus-visible:ring-2 focus-visible:ring-cyan-400/60"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input
                            id="email"
                            name="email"
                            type="email"
                            placeholder="e.g. accounts@client.com"
                            className="transition focus-visible:ring-2 focus-visible:ring-cyan-400/60"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="notes">Notes</Label>
                        <Textarea
                            id="notes"
                            name="notes"
                            placeholder="Any extra info..."
                            rows={4}
                            className="transition focus-visible:ring-2 focus-visible:ring-cyan-400/60"
                        />
                    </div>

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setOpen(false)}
                            disabled={loading}
                            className="cursor-pointer transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed"
                        >
                            Cancel
                        </Button>

                        <Button
                            type="submit"
                            disabled={loading}
                            className="cursor-pointer transition hover:brightness-110 disabled:cursor-not-allowed"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Saving...
                                </>
                            ) : (
                                "Create Client"
                            )}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}