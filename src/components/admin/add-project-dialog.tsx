"use client";

import { useMemo, useState } from "react";
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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

type ClientOption = { id: string; name: string };

type Props = {
    clients: ClientOption[];
    defaultClientId?: string;
    onCreate: (formData: FormData) => Promise<{ ok: boolean; message?: string }>;
};

function todayYYYYMMDD() {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
}

export default function AddProjectDialog({ clients, defaultClientId, onCreate }: Props) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);

    const [clientId, setClientId] = useState(defaultClientId ?? "");
    const [status, setStatus] = useState("in-progress");
    const [priority, setPriority] = useState("medium");

    const defaultStartDate = useMemo(() => todayYYYYMMDD(), []);
    const defaultDueDate = useMemo(() => "", []);

    async function handleSubmit(formData: FormData) {
        setLoading(true);
        try {
            formData.set("client_id", clientId);
            formData.set("status", status);
            formData.set("priority", priority);

            const res = await onCreate(formData);
            if (!res.ok) {
                toast.error(res.message || "Failed to create project.");
                return;
            }

            toast.success("Project created.");
            setOpen(false);

            if (!defaultClientId) setClientId("");
            setStatus("in-progress");
            setPriority("medium");
        } catch (e: any) {
            toast.error(e?.message || "Failed to create project.");
        } finally {
            setLoading(false);
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button
                    disabled={loading}
                    className="cursor-pointer transition hover:opacity-90 disabled:cursor-not-allowed"
                >
                    + Add Project
                </Button>
            </DialogTrigger>

            <DialogContent className="sm:max-w-xl">
                <DialogHeader>
                    <DialogTitle>Add Project</DialogTitle>
                    <DialogDescription>Projects are always linked to a client.</DialogDescription>
                </DialogHeader>

                <form action={handleSubmit} className="space-y-4">
                    <input type="hidden" name="client_id" value={clientId} />
                    <input type="hidden" name="status" value={status} />
                    <input type="hidden" name="priority" value={priority} />

                    <div className="space-y-2">
                        <Label>Client</Label>
                        <Select value={clientId} onValueChange={setClientId}>
                            <SelectTrigger className="cursor-pointer">
                                <SelectValue placeholder="Select a client" />
                            </SelectTrigger>
                            <SelectContent>
                                {clients.map((c) => (
                                    <SelectItem key={c.id} value={c.id}>
                                        {c.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        {!clientId ? <div className="text-xs text-muted-foreground">Required</div> : null}
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="title">Project Title</Label>
                        <Input id="title" name="title" placeholder="e.g. Brand identity + website" required />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="description">Description</Label>
                        <Textarea id="description" name="description" placeholder="Short brief..." rows={4} />
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                            <Label>Status</Label>
                            <Select value={status} onValueChange={setStatus}>
                                <SelectTrigger className="cursor-pointer">
                                    <SelectValue placeholder="Select status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="lead">Lead</SelectItem>
                                    <SelectItem value="onboarding">Onboarding</SelectItem>
                                    <SelectItem value="in-progress">In Progress</SelectItem>
                                    <SelectItem value="review">Review</SelectItem>
                                    <SelectItem value="blocked">Blocked</SelectItem>
                                    <SelectItem value="done">Done</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label>Priority</Label>
                            <Select value={priority} onValueChange={setPriority}>
                                <SelectTrigger className="cursor-pointer">
                                    <SelectValue placeholder="Select priority" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="low">Low</SelectItem>
                                    <SelectItem value="medium">Medium</SelectItem>
                                    <SelectItem value="high">High</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                            <Label htmlFor="start_date">Start Date</Label>
                            <Input id="start_date" name="start_date" type="date" defaultValue={defaultStartDate} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="due_date">Due Date</Label>
                            <Input id="due_date" name="due_date" type="date" defaultValue={defaultDueDate} />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="internal_notes">Internal Notes</Label>
                        <Textarea id="internal_notes" name="internal_notes" placeholder="Only admins see this..." rows={3} />
                    </div>

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setOpen(false)}
                            disabled={loading}
                            className="cursor-pointer"
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            disabled={loading || !clientId}
                            className="cursor-pointer disabled:cursor-not-allowed"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Saving...
                                </>
                            ) : (
                                "Create Project"
                            )}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}