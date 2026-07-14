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
type ProjectOption = { id: string; title: string; client_id: string };

type Props = {
    clients: ClientOption[];
    projects: ProjectOption[];
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

export default function AddInvoiceDialog({ clients, projects, defaultClientId, onCreate }: Props) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);

    const [clientId, setClientId] = useState(defaultClientId ?? "");
    const [projectId, setProjectId] = useState("__none__");
    const [status, setStatus] = useState("draft");

    const defaultIssueDate = useMemo(() => todayYYYYMMDD(), []);
    const defaultDueDate = useMemo(() => todayYYYYMMDD(), []);

    const filteredProjects = useMemo(() => {
        if (!clientId) return [];
        return projects.filter((p) => p.client_id === clientId);
    }, [projects, clientId]);

    async function handleSubmit(formData: FormData) {
        setLoading(true);

        try {
            formData.set("client_id", clientId);
            formData.set("project_id", projectId);
            formData.set("status", status);

            const res = await onCreate(formData);
            if (!res.ok) {
                toast.error(res.message || "Failed to create invoice.");
                return;
            }

            toast.success("Invoice created.");
            setOpen(false);

            if (!defaultClientId) setClientId("");
            setProjectId("__none__");
            setStatus("draft");
        } catch (e: any) {
            toast.error(e?.message || "Failed to create invoice.");
        } finally {
            setLoading(false);
        }
    }

    function onClientChange(v: string) {
        setClientId(v);
        setProjectId("__none__");
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button
                    disabled={loading}
                    className="cursor-pointer border-0 bg-white text-black transition hover:bg-slate-100 disabled:cursor-not-allowed"
                >
                    + Create Invoice
                </Button>
            </DialogTrigger>

            <DialogContent className="sm:max-w-xl">
                <DialogHeader>
                    <DialogTitle>Create Invoice</DialogTitle>
                    <DialogDescription>
                        Invoices must be linked to a client (project optional).
                    </DialogDescription>
                </DialogHeader>

                <form action={handleSubmit} className="space-y-4">
                    <input type="hidden" name="client_id" value={clientId} />
                    <input type="hidden" name="project_id" value={projectId} />
                    <input type="hidden" name="status" value={status} />

                    <div className="space-y-2">
                        <Label>Client</Label>
                        <Select value={clientId} onValueChange={onClientChange}>
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
                        <Label>Project (optional)</Label>
                        <Select value={projectId} onValueChange={setProjectId}>
                            <SelectTrigger className="cursor-pointer">
                                <SelectValue placeholder="None" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="__none__">None</SelectItem>

                                {clientId ? (
                                    filteredProjects.length ? (
                                        filteredProjects.map((p) => (
                                            <SelectItem key={p.id} value={p.id}>
                                                {p.title}
                                            </SelectItem>
                                        ))
                                    ) : (
                                        <SelectItem value="__no_projects__" disabled>
                                            No projects for this client
                                        </SelectItem>
                                    )
                                ) : (
                                    <SelectItem value="__select_client__" disabled>
                                        Select a client first
                                    </SelectItem>
                                )}
                            </SelectContent>
                        </Select>

                        <div className="text-xs text-muted-foreground">
                            Now filtered by the selected client.
                        </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                            <Label htmlFor="issue_date">Issue Date</Label>
                            <Input id="issue_date" name="issue_date" type="date" defaultValue={defaultIssueDate} required />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="due_date">Due Date</Label>
                            <Input id="due_date" name="due_date" type="date" defaultValue={defaultDueDate} required />
                        </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-3">
                        <div className="space-y-2">
                            <Label htmlFor="subtotal">Subtotal</Label>
                            <Input id="subtotal" name="subtotal" type="number" step="0.01" placeholder="0.00" required />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="tax">Tax</Label>
                            <Input id="tax" name="tax" type="number" step="0.01" placeholder="0.00" required />
                        </div>

                        <div className="space-y-2">
                            <Label>Status</Label>
                            <Select value={status} onValueChange={setStatus}>
                                <SelectTrigger className="cursor-pointer">
                                    <SelectValue placeholder="Select status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="draft">Draft</SelectItem>
                                    <SelectItem value="sent">Sent</SelectItem>
                                    <SelectItem value="paid">Paid</SelectItem>
                                    <SelectItem value="overdue">Overdue</SelectItem>
                                    <SelectItem value="cancelled">Cancelled</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="notes">Notes</Label>
                        <Textarea id="notes" name="notes" placeholder="e.g. Payment terms, scope summary..." rows={3} />
                    </div>

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setOpen(false)}
                            disabled={loading}
                            className="cursor-pointer transition hover:bg-slate-50 disabled:cursor-not-allowed"
                        >
                            Cancel
                        </Button>

                        <Button
                            type="submit"
                            disabled={loading || !clientId}
                            className="cursor-pointer border-0 bg-gradient-to-r from-fuchsia-500 to-purple-600 text-white transition hover:from-fuchsia-500/90 hover:to-purple-600/90 disabled:cursor-not-allowed"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Saving...
                                </>
                            ) : (
                                "Create Invoice"
                            )}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}