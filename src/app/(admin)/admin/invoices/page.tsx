import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
    CalendarRange,
    Download,
    FileText,
    Pencil,
    Receipt,
    Sparkles,
    Trash2,
    Wallet,
    CheckCheck,
} from "lucide-react";
import AddInvoiceDialog from "@/components/admin/add-invoice-dialog";
import InvoicesFilters from "@/components/admin/invoices-filters";
import InvoiceStatusSelect from "@/components/admin/invoice-status-select";
import DeleteInvoiceButton from "@/components/admin/delete-invoice-button";
import InvoiceMonthNav from "@/components/admin/invoice-month-nav";
import InvoicesArchiveMonthsNav from "@/components/admin/invoices-archive-months-nav";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type ClientOption = { id: string; name: string };
type ProjectOption = { id: string; title: string; client_id: string };

type InvoiceRow = {
    id: string;
    client_id: string;
    client_name: string;
    project_id: string | null;
    project_title: string | null;
    invoice_number: string;
    status: string;
    issue_date: string;
    due_date: string;
    total: number;
    created_at: string;
};

type InvoiceEditRow = {
    id: string;
    client_id: string;
    project_id: string | null;
    invoice_number: string;
    status: string;
    issue_date: string;
    due_date: string;
    subtotal: number;
    tax: number;
    total: number;
    notes: string | null;
    created_at: string;
};

type ReportingPeriodRow = {
    period_start: string;
    status: string;
};

type PageProps = {
    searchParams?: Promise<{
        client?: string;
        q?: string;
        status?: string;
        overdue?: string;
        month?: string;
        saved?: string;
        invoice?: string;
    }>;
};

function fmtDate(d: string | null) {
    if (!d) return "—";
    return new Date(d).toLocaleDateString("en-ZA", {
        year: "numeric",
        month: "short",
        day: "2-digit",
    });
}

function money(v: any) {
    const n = Number(v ?? 0);
    return n.toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function pad2(n: number) {
    return String(n).padStart(2, "0");
}

function monthStartISOFromParam(month?: string) {
    const m = (month ?? "").trim();
    if (!/^\d{4}-\d{2}$/.test(m)) return null;
    return `${m}-01`;
}

function parseMonthStart(isoStart: string) {
    const y = Number(isoStart.slice(0, 4));
    const m = Number(isoStart.slice(5, 7));
    return { y, m };
}

function addMonthsStartISO(isoStart: string, delta: number) {
    const { y, m } = parseMonthStart(isoStart);
    let mm = m - 1 + delta;
    let yy = y;

    while (mm < 0) {
        mm += 12;
        yy -= 1;
    }
    while (mm > 11) {
        mm -= 12;
        yy += 1;
    }

    return `${yy}-${pad2(mm + 1)}-01`;
}

function monthLabelFromStartISO(isoStart: string) {
    const { y, m } = parseMonthStart(isoStart);
    const d = new Date(Date.UTC(y, m - 1, 1));
    return d.toLocaleDateString("en-ZA", { month: "long", year: "numeric" });
}

function toMonthParam(isoStart: string) {
    return isoStart.slice(0, 7);
}

function normalizeStatus(status: string | null | undefined) {
    return String(status ?? "").trim().toLowerCase();
}

function prettyStatus(status: string) {
    const s = normalizeStatus(status);
    if (s === "draft") return "Draft";
    if (s === "sent") return "Sent";
    if (s === "paid") return "Paid";
    if (s === "overdue") return "Overdue";
    if (s === "cancelled") return "Cancelled";
    return status;
}

function buildInvoicesUrl(params: {
    month: string;
    q?: string;
    status?: string;
    overdue?: boolean;
    client?: string;
    saved?: string;
    invoice?: string;
}) {
    const qp = new URLSearchParams();
    qp.set("month", params.month);
    if (params.q) qp.set("q", params.q);
    if (params.status && params.status !== "all") qp.set("status", params.status);
    if (params.overdue) qp.set("overdue", "1");
    if (params.client) qp.set("client", params.client);
    if (params.saved) qp.set("saved", params.saved);
    if (params.invoice) qp.set("invoice", params.invoice);
    return `/admin/invoices?${qp.toString()}`;
}

export default async function InvoicesPage({ searchParams }: PageProps) {
    const sp = (await searchParams) ?? {};
    const defaultClientId = sp.client ? String(sp.client) : undefined;
    const q = (sp.q ? String(sp.q) : "").trim();
    const statusFilter = (sp.status ? String(sp.status) : "").trim();
    const overdueOnly = sp.overdue === "1";
    const saved = (sp.saved ? String(sp.saved) : "").trim();
    const selectedInvoiceId = (sp.invoice ? String(sp.invoice) : "").trim();

    const now = new Date();
    const currentMonthStart = `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-01`;
    const selectedMonthStart = monthStartISOFromParam(sp.month) ?? currentMonthStart;
    const nextMonthStart = addMonthsStartISO(selectedMonthStart, 1);
    const prevMonthStart = addMonthsStartISO(selectedMonthStart, -1);
    const todayIso = new Date().toISOString().slice(0, 10);

    const supabase = await createClient();
    const { data: userRes } = await supabase.auth.getUser();
    if (!userRes?.user) redirect("/login");

    async function createInvoiceAction(formData: FormData) {
        "use server";

        const supabase = await createClient();

        const client_id = String(formData.get("client_id") ?? "").trim();
        const project_id_raw = String(formData.get("project_id") ?? "").trim();
        const project_id = project_id_raw && project_id_raw !== "__none__" ? project_id_raw : null;

        const issue_date = String(formData.get("issue_date") ?? "").trim();
        const due_date = String(formData.get("due_date") ?? "").trim();

        const subtotal = Number(formData.get("subtotal") ?? 0);
        const tax = Number(formData.get("tax") ?? 0);
        const status = normalizeStatus(String(formData.get("status") ?? "draft"));
        const notes = String(formData.get("notes") ?? "").trim() || null;

        if (!client_id) return { ok: false, message: "Client is required." };
        if (!issue_date) return { ok: false, message: "Issue date is required." };
        if (!due_date) return { ok: false, message: "Due date is required." };
        if (!Number.isFinite(subtotal) || !Number.isFinite(tax)) {
            return { ok: false, message: "Subtotal and tax must be valid numbers." };
        }

        const { data: invoice_number, error: numErr } = await supabase.rpc("next_invoice_number");
        if (numErr || !invoice_number) {
            return { ok: false, message: numErr?.message || "Failed to generate invoice number." };
        }

        const total = Number((subtotal + tax).toFixed(2));

        const { error } = await supabase.from("invoices").insert({
            client_id,
            project_id,
            invoice_number,
            issue_date,
            due_date,
            subtotal,
            tax,
            total,
            status,
            notes,
        });

        if (error) return { ok: false, message: error.message };

        revalidatePath("/admin/invoices");
        revalidatePath("/admin");
        revalidatePath("/admin/reports");

        return {
    ok: true,
    message: "Invoice created successfully.",
};
    }

    async function markPaidAction(invoiceId: string) {
        "use server";

        const supabase = await createClient();

        const { error } = await supabase
            .from("invoices")
            .update({ status: "paid", updated_at: new Date().toISOString() })
            .eq("id", invoiceId);

        if (error) {
            redirect(
                buildInvoicesUrl({
                    month: toMonthParam(selectedMonthStart),
                    q,
                    status: statusFilter,
                    overdue: overdueOnly,
                    client: defaultClientId,
                    saved: "error",
                })
            );
        }

        revalidatePath("/admin/invoices");
        revalidatePath("/admin");
        revalidatePath("/admin/reports");

        redirect(
            buildInvoicesUrl({
                month: toMonthParam(selectedMonthStart),
                q,
                status: statusFilter,
                overdue: overdueOnly,
                client: defaultClientId,
                saved: "invoice-paid",
            })
        );
    }

    async function updateInvoiceStatusAction(formData: FormData) {
        "use server";

        const supabase = await createClient();

        const invoiceId = String(formData.get("invoice_id") ?? "").trim();
        const status = normalizeStatus(String(formData.get("status") ?? ""));

        if (!invoiceId) {
            return { ok: false, message: "Invoice ID is required." };
        }

        const allowed = ["draft", "sent", "paid", "overdue", "cancelled"];
        if (!allowed.includes(status)) {
            return { ok: false, message: "Invalid status." };
        }

        const { error } = await supabase
            .from("invoices")
            .update({
                status,
                updated_at: new Date().toISOString(),
            })
            .eq("id", invoiceId);

        if (error) {
            return { ok: false, message: error.message };
        }

        revalidatePath("/admin/invoices");
        revalidatePath("/admin");
        revalidatePath("/admin/reports");
        revalidatePath(`/admin/invoices/${invoiceId}/edit`);
        return { ok: true as const, message: "Invoice status updated." };
    }

    async function updateInvoiceModalAction(formData: FormData) {
        "use server";

        if (!selectedInvoiceId) {
            redirect(
                buildInvoicesUrl({
                    month: toMonthParam(selectedMonthStart),
                    q,
                    status: statusFilter,
                    overdue: overdueOnly,
                    client: defaultClientId,
                    saved: "error",
                })
            );
        }

        const supabase = await createClient();

        const issue_date = String(formData.get("issue_date") ?? "").trim();
        const due_date = String(formData.get("due_date") ?? "").trim();
        const status = normalizeStatus(String(formData.get("status") ?? "draft"));
        const subtotal = Number(formData.get("subtotal") ?? 0);
        const tax = Number(formData.get("tax") ?? 0);
        const notes = String(formData.get("notes") ?? "").trim() || null;

        if (!issue_date || !due_date || !Number.isFinite(subtotal) || !Number.isFinite(tax)) {
            redirect(
                buildInvoicesUrl({
                    month: toMonthParam(selectedMonthStart),
                    q,
                    status: statusFilter,
                    overdue: overdueOnly,
                    client: defaultClientId,
                    invoice: selectedInvoiceId,
                    saved: "error",
                })
            );
        }

        const total = Number((subtotal + tax).toFixed(2));

        const { error } = await supabase
            .from("invoices")
            .update({
                issue_date,
                due_date,
                status,
                subtotal,
                tax,
                total,
                notes,
                updated_at: new Date().toISOString(),
            })
            .eq("id", selectedInvoiceId);

        if (error) {
            redirect(
                buildInvoicesUrl({
                    month: toMonthParam(selectedMonthStart),
                    q,
                    status: statusFilter,
                    overdue: overdueOnly,
                    client: defaultClientId,
                    invoice: selectedInvoiceId,
                    saved: "error",
                })
            );
        }

        revalidatePath("/admin/invoices");
        revalidatePath("/admin");
        revalidatePath("/admin/reports");
        revalidatePath(`/admin/invoices/${selectedInvoiceId}/edit`);

        redirect(
            buildInvoicesUrl({
                month: toMonthParam(selectedMonthStart),
                q,
                status: statusFilter,
                overdue: overdueOnly,
                client: defaultClientId,
                saved: "invoice-updated",
            })
        );
    }

async function deleteInvoiceModalAction() {
    "use server";

    if (!selectedInvoiceId) {
        return { ok: false, message: "Invoice ID is missing." };
    }

    const supabase = await createClient();

    const { error } = await supabase.from("invoices").delete().eq("id", selectedInvoiceId);

    if (error) return { ok: false, message: error.message };

    revalidatePath("/admin/invoices");
    revalidatePath("/admin");
    revalidatePath("/admin/reports");

    return { ok: true as const, message: "Invoice deleted." };
}

    async function deleteInvoiceAction(invoiceId: string) {
        "use server";

        const supabase = await createClient();

        const { error } = await supabase.from("invoices").delete().eq("id", invoiceId);

        if (error) return { ok: false, message: error.message };

        revalidatePath("/admin/invoices");
        revalidatePath("/admin");
        revalidatePath("/admin/reports");

        return { ok: true as const };
    }

    const { data: clientsData, error: clientsError } = await supabase
        .from("clients")
        .select("id,name")
        .order("created_at", { ascending: false });
    const clients = (clientsData ?? []) as ClientOption[];

    const { data: projectsData, error: projectsError } = await supabase
        .from("projects")
        .select("id,title,client_id")
        .order("created_at", { ascending: false });
    const projects = (projectsData ?? []) as ProjectOption[];

    let invQuery = supabase
        .from("invoices_search")
        .select("id,client_id,client_name,project_id,project_title,invoice_number,status,issue_date,due_date,total,created_at")
        .order("due_date", { ascending: false });

    if (defaultClientId) invQuery = invQuery.eq("client_id", defaultClientId);
    if (statusFilter && statusFilter !== "all") invQuery = invQuery.eq("status", statusFilter);

    if (q) {
        const like = `%${q}%`;
        invQuery = invQuery.or(`invoice_number.ilike.${like},client_name.ilike.${like}`);
    }

    invQuery = invQuery.gte("due_date", selectedMonthStart).lt("due_date", nextMonthStart);

    if (overdueOnly) {
        invQuery = invQuery
            .neq("status", "paid")
            .neq("status", "cancelled")
            .lt("due_date", todayIso);
    }

    const { data: invoicesData, error: invoicesError } = await invQuery;
    const invoices = (invoicesData ?? []) as InvoiceRow[];

    const monthTotal = invoices.reduce((sum, inv) => sum + Number(inv.total ?? 0), 0);
    const paidInvoices = invoices.filter((inv) => normalizeStatus(inv.status) === "paid");
    const unpaidInvoices = invoices.filter((inv) => {
        const s = normalizeStatus(inv.status);
        return s !== "paid" && s !== "cancelled";
    });
    const overdueInvoices = unpaidInvoices.filter((inv) => inv.due_date < todayIso);

    const paidCount = paidInvoices.length;
    const unpaidCount = unpaidInvoices.length;
    const overdueCount = overdueInvoices.length;

    const paidTotal = paidInvoices.reduce((sum, inv) => sum + Number(inv.total ?? 0), 0);
    const unpaidTotal = unpaidInvoices.reduce((sum, inv) => sum + Number(inv.total ?? 0), 0);
    const overdueTotal = overdueInvoices.reduce((sum, inv) => sum + Number(inv.total ?? 0), 0);

    const { data: periodsData } = await supabase
        .from("reporting_periods")
        .select("period_start,status")
        .eq("status", "closed")
        .order("period_start", { ascending: false })
        .limit(12);

    const closedMonths = (periodsData ?? []) as ReportingPeriodRow[];
    const selectedMonthIsClosed = closedMonths.some((m) => m.period_start === selectedMonthStart);
    const isCurrentMonth = selectedMonthStart === currentMonthStart;

    let selectedInvoice: InvoiceEditRow | null = null;
    let selectedInvoiceError = "";

    if (selectedInvoiceId) {
        const { data, error } = await supabase
            .from("invoices")
            .select("id,client_id,project_id,invoice_number,status,issue_date,due_date,subtotal,tax,total,notes,created_at")
            .eq("id", selectedInvoiceId)
            .maybeSingle();

        if (error) {
            selectedInvoiceError = error.message;
        } else {
            selectedInvoice = (data ?? null) as InvoiceEditRow | null;
        }
    }

    const successMessage =
        saved === "invoice-paid"
            ? "Invoice marked as paid successfully."
            : saved === "invoice-updated"
                ? "Invoice updated successfully."
                : saved === "invoice-deleted"
                    ? "Invoice deleted successfully."
                    : saved === "invoice-created"
                        ? "Invoice created successfully."
                        : saved === "error"
                            ? "Something went wrong while saving."
                            : "";

    const successIsError = saved === "error";

    const baseListUrl = buildInvoicesUrl({
        month: toMonthParam(selectedMonthStart),
        q,
        status: statusFilter,
        overdue: overdueOnly,
        client: defaultClientId,
    });

    const prevHref = buildInvoicesUrl({
        month: toMonthParam(prevMonthStart),
        q,
        status: statusFilter,
        overdue: overdueOnly,
        client: defaultClientId,
    });

    const currentHref = buildInvoicesUrl({
        month: toMonthParam(currentMonthStart),
        q,
        status: statusFilter,
        overdue: overdueOnly,
        client: defaultClientId,
    });

    const nextHref = buildInvoicesUrl({
        month: toMonthParam(nextMonthStart),
        q,
        status: statusFilter,
        overdue: overdueOnly,
        client: defaultClientId,
    });

    const archiveMonths = closedMonths.map((m) => ({
        href: buildInvoicesUrl({
            month: toMonthParam(m.period_start),
            q,
            status: statusFilter,
            overdue: overdueOnly,
            client: defaultClientId,
        }),
        label: monthLabelFromStartISO(m.period_start),
        active: m.period_start === selectedMonthStart,
    }));

    const invoiceListDownloadHref = `/api/invoices/pdf?${new URLSearchParams({
        month: toMonthParam(selectedMonthStart),
        ...(q ? { q } : {}),
        ...(statusFilter && statusFilter !== "all" ? { status: statusFilter } : {}),
        ...(overdueOnly ? { overdue: "1" } : {}),
        ...(defaultClientId ? { client: defaultClientId } : {}),
    }).toString()}`;

    return (
        <div className="space-y-6">
            {successMessage ? (
                <div
                    className={
                        successIsError
                            ? "rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive"
                            : "rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-700"
                    }
                >
                    {successMessage}
                </div>
            ) : null}

            {selectedInvoice || selectedInvoiceError ? (
                <Dialog open>
                    <DialogContent className="max-h-[90vh] overflow-y-auto border-white/10 bg-white sm:max-w-3xl" showCloseButton={false}>
                        {selectedInvoiceError ? (
                            <div className="space-y-4">
                                <DialogHeader>
                                    <DialogTitle>Invoice</DialogTitle>
                                    <DialogDescription>Could not load invoice details.</DialogDescription>
                                </DialogHeader>

                                <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
                                    {selectedInvoiceError}
                                </div>

                                <div className="flex justify-end">
                                    <Button asChild variant="outline">
                                        <Link href={baseListUrl}>Close</Link>
                                    </Button>
                                </div>
                            </div>
                        ) : selectedInvoice ? (
                            <div className="space-y-6">
                                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                                    <DialogHeader className="text-left">
                                        <DialogTitle className="flex flex-wrap items-center gap-2">
                                            <span>Edit Invoice</span>
                                            <Badge
                                                variant={
                                                    normalizeStatus(selectedInvoice.status) === "paid"
                                                        ? "secondary"
                                                        : normalizeStatus(selectedInvoice.status) === "overdue"
                                                            ? "destructive"
                                                            : "outline"
                                                }
                                            >
                                                {prettyStatus(selectedInvoice.status)}
                                            </Badge>
                                        </DialogTitle>
                                        <DialogDescription>{selectedInvoice.invoice_number}</DialogDescription>
                                    </DialogHeader>

                                    <div className="flex flex-wrap gap-2">
                                        <Button asChild variant="outline">
                                            <Link href={baseListUrl}>Close</Link>
                                        </Button>
                                        <Button
                                            asChild
                                            className="border-0 bg-gradient-to-r from-fuchsia-500 to-purple-600 text-white hover:from-fuchsia-500/90 hover:to-purple-600/90"
                                        >
                                            <a href={`/api/invoices/${selectedInvoice.id}/pdf`} target="_blank" rel="noreferrer" className="flex items-center gap-2">
                                                <Download className="h-4 w-4" />
                                                Download PDF
                                            </a>
                                        </Button>
                                    </div>
                                </div>

                                <div className="space-y-6">
                                    <form action={updateInvoiceModalAction} className="space-y-4">
                                        <div className="grid gap-4 sm:grid-cols-2">
                                            <div className="space-y-2">
                                                <Label>Invoice Number</Label>
                                                <Input value={selectedInvoice.invoice_number} readOnly />
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="modal_status">Status</Label>
                                                <select
                                                    id="modal_status"
                                                    name="status"
                                                    defaultValue={normalizeStatus(selectedInvoice.status)}
                                                    className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                                                >
                                                    <option value="draft">Draft</option>
                                                    <option value="sent">Sent</option>
                                                    <option value="paid">Paid</option>
                                                    <option value="overdue">Overdue</option>
                                                    <option value="cancelled">Cancelled</option>
                                                </select>
                                                <div className="text-xs text-muted-foreground">
                                                    draft / sent / paid / overdue / cancelled
                                                </div>
                                            </div>
                                        </div>

                                        <div className="grid gap-4 sm:grid-cols-2">
                                            <div className="space-y-2">
                                                <Label htmlFor="modal_issue_date">Issue Date</Label>
                                                <Input
                                                    id="modal_issue_date"
                                                    name="issue_date"
                                                    type="date"
                                                    defaultValue={selectedInvoice.issue_date}
                                                    required
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="modal_due_date">Due Date</Label>
                                                <Input
                                                    id="modal_due_date"
                                                    name="due_date"
                                                    type="date"
                                                    defaultValue={selectedInvoice.due_date}
                                                    required
                                                />
                                            </div>
                                        </div>

                                        <div className="grid gap-4 sm:grid-cols-3">
                                            <div className="space-y-2">
                                                <Label htmlFor="modal_subtotal">Subtotal</Label>
                                                <Input
                                                    id="modal_subtotal"
                                                    name="subtotal"
                                                    type="number"
                                                    step="0.01"
                                                    defaultValue={selectedInvoice.subtotal ?? 0}
                                                    required
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="modal_tax">Tax</Label>
                                                <Input
                                                    id="modal_tax"
                                                    name="tax"
                                                    type="number"
                                                    step="0.01"
                                                    defaultValue={selectedInvoice.tax ?? 0}
                                                    required
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Total (calc)</Label>
                                                <Input value={money(selectedInvoice.total)} readOnly />
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="modal_notes">Notes</Label>
                                            <Textarea
                                                id="modal_notes"
                                                name="notes"
                                                defaultValue={selectedInvoice.notes ?? ""}
                                                rows={4}
                                            />
                                        </div>

                                        <div className="flex flex-wrap gap-2">
                                            <Button
                                                type="submit"
                                                className="border-0 bg-gradient-to-r from-fuchsia-500 to-purple-600 text-white hover:from-fuchsia-500/90 hover:to-purple-600/90"
                                            >
                                                Save Changes
                                            </Button>
                                            <Button asChild type="button" variant="outline">
                                                <Link href={baseListUrl}>Cancel</Link>
                                            </Button>
                                        </div>
                                    </form>

                                    <div className="pt-2">
                                        <div className="text-sm font-semibold">Danger zone</div>
                                        <div className="mt-1 text-sm text-muted-foreground">
                                            Deleting an invoice is permanent.
                                        </div>
                                        <div className="mt-3">
                                            <DeleteInvoiceButton
    invoiceNumber={selectedInvoice.invoice_number}
    onDelete={deleteInvoiceModalAction}
    successHref={baseListUrl}
/>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : null}
                    </DialogContent>
                </Dialog>
            ) : null}

            <div className="relative overflow-hidden rounded-[28px] border border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(122,60,255,0.20),transparent_26%),radial-gradient(circle_at_top_right,rgba(0,229,255,0.14),transparent_28%),linear-gradient(180deg,#090914_0%,#0d0d18_100%)] p-6 text-white shadow-2xl shadow-fuchsia-950/20">
                <div className="absolute inset-0 opacity-25">
                    <div className="absolute left-[8%] top-[18%] h-56 w-56 rounded-full border border-white/10" />
                    <div className="absolute right-[10%] top-[18%] h-72 w-72 rounded-full border border-white/10" />
                    <div className="absolute bottom-[14%] left-[26%] h-44 w-44 rounded-full border border-white/10" />
                </div>

                <div className="relative flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
                        <InvoicesFilters initialQ={q} initialStatus={statusFilter || "all"} initialOverdue={overdueOnly} />
                        <AddInvoiceDialog clients={clients} projects={projects} defaultClientId={defaultClientId} onCreate={createInvoiceAction} />
                    </div>
                </div>
            </div>

            <Card className="border-white/10 shadow-sm">
                <CardHeader className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                        <CardTitle className="flex items-center gap-2">
                            <CalendarRange className="h-5 w-5 text-fuchsia-500" />
                            {monthLabelFromStartISO(selectedMonthStart)}
                        </CardTitle>
                        <CardDescription>
                            {isCurrentMonth ? "Current month view" : "Archive month view"} •{" "}
                            {selectedMonthIsClosed ? "Closed / archived" : "Open / live"}
                        </CardDescription>
                    </div>

                    <InvoiceMonthNav
                        prevHref={prevHref}
                        currentHref={currentHref}
                        nextHref={nextHref}
                    />
                </CardHeader>

                <CardContent className="space-y-4">
                    <InvoicesArchiveMonthsNav months={archiveMonths} />

                    <div className="grid gap-4 md:grid-cols-4">
                        <Card className="border-white/10">
                            <CardHeader className="pb-2">
                                <CardTitle className="flex items-center gap-2 text-sm font-medium">
                                    <FileText className="h-4 w-4 text-fuchsia-500" />
                                    Invoices
                                </CardTitle>
                                <CardDescription>Due in this month</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="text-3xl font-semibold">{invoices.length}</div>
                                <div className="mt-1 text-xs text-muted-foreground">R {money(monthTotal)}</div>
                            </CardContent>
                        </Card>

                        <Card className="border-white/10">
                            <CardHeader className="pb-2">
                                <CardTitle className="flex items-center gap-2 text-sm font-medium">
                                    <Wallet className="h-4 w-4 text-emerald-500" />
                                    Paid
                                </CardTitle>
                                <CardDescription>Marked paid</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="text-3xl font-semibold">{paidCount}</div>
                                <div className="mt-1 text-xs text-muted-foreground">R {money(paidTotal)}</div>
                            </CardContent>
                        </Card>

                        <Card className="border-white/10">
                            <CardHeader className="pb-2">
                                <CardTitle className="flex items-center gap-2 text-sm font-medium">
                                    <Receipt className="h-4 w-4 text-cyan-500" />
                                    Unpaid
                                </CardTitle>
                                <CardDescription>Not paid / not cancelled</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="text-3xl font-semibold">{unpaidCount}</div>
                                <div className="mt-1 text-xs text-muted-foreground">R {money(unpaidTotal)}</div>
                            </CardContent>
                        </Card>

                        <Card className="border-white/10">
                            <CardHeader className="pb-2">
                                <CardTitle className="flex items-center gap-2 text-sm font-medium">
                                    <Sparkles className="h-4 w-4 text-red-500" />
                                    Overdue
                                </CardTitle>
                                <CardDescription>Due date passed</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="text-3xl font-semibold">{overdueCount}</div>
                                <div className="mt-1 text-xs text-muted-foreground">R {money(overdueTotal)}</div>
                            </CardContent>
                        </Card>
                    </div>
                </CardContent>
            </Card>

            {clientsError ? (
                <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
                    Failed to load clients: {clientsError.message}
                </div>
            ) : null}

            {projectsError ? (
                <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
                    Failed to load projects: {projectsError.message}
                </div>
            ) : null}

            <Card className="border-white/10 shadow-sm">
                <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                        <CardTitle>Invoice List</CardTitle>
                        <CardDescription>
                            {q || (statusFilter && statusFilter !== "all") || overdueOnly ? (
                                <>
                                    Showing {invoices.length} result{invoices.length === 1 ? "" : "s"} for{" "}
                                    <span className="font-medium">{monthLabelFromStartISO(selectedMonthStart)}</span>
                                </>
                            ) : (
                                <>
                                    {invoices.length} invoice{invoices.length === 1 ? "" : "s"} for{" "}
                                    <span className="font-medium">{monthLabelFromStartISO(selectedMonthStart)}</span>
                                </>
                            )}
                        </CardDescription>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        <Button
                            asChild
                            variant="outline"
                            className="cursor-pointer border-cyan-200 text-cyan-700 transition hover:border-cyan-300 hover:bg-cyan-50 hover:text-cyan-800"
                        >
                            <a href={invoiceListDownloadHref} target="_blank" rel="noreferrer" className="flex items-center gap-2">
                                <Download className="h-4 w-4" />
                                Download List
                            </a>
                        </Button>

                        {invoicesError ? (
                            <Badge variant="destructive" className="w-fit">
                                DB Error
                            </Badge>
                        ) : (
                            <Badge
                                variant="outline"
                                className={
                                    selectedMonthIsClosed
                                        ? "border-fuchsia-200 bg-fuchsia-50 text-fuchsia-700"
                                        : "border-cyan-200 bg-cyan-50 text-cyan-700"
                                }
                            >
                                {selectedMonthIsClosed ? "Archived View" : "Live View"}
                            </Badge>
                        )}
                    </div>
                </CardHeader>

                <CardContent>
                    {invoicesError ? (
                        <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
                            {invoicesError.message}
                        </div>
                    ) : invoices.length === 0 ? (
                        <div className="rounded-lg border bg-background p-6">
                            <div className="text-sm font-medium">No invoices for this month</div>
                            <div className="mt-1 text-sm text-muted-foreground">Try a different month or clear filters.</div>
                        </div>
                    ) : (
                        <div className="overflow-hidden rounded-xl border">
                            <Table>
                                <TableHeader className="bg-slate-200/90">
                                    <TableRow className="border-b border-slate-300 hover:bg-slate-200/90">
                                        <TableHead className="font-semibold text-slate-800">#</TableHead>
                                        <TableHead className="font-semibold text-slate-800">Client</TableHead>
                                        <TableHead className="font-semibold text-slate-800">Project</TableHead>
                                        <TableHead className="font-semibold text-slate-800">Status</TableHead>
                                        <TableHead className="font-semibold text-slate-800">Issue</TableHead>
                                        <TableHead className="font-semibold text-slate-800">Due</TableHead>
                                        <TableHead className="text-right font-semibold text-slate-800">Total (R)</TableHead>
                                        <TableHead className="text-right font-semibold text-slate-800">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>

                                <TableBody>
                                    {invoices.map((inv, index) => {
                                        const normalizedStatus = normalizeStatus(inv.status);

                                        return (
                                            <TableRow
                                                key={`${inv.id}-${normalizedStatus}`}
                                                className={index % 2 === 0 ? "bg-white" : "bg-slate-50/60"}
                                            >
                                                <TableCell className="font-medium">
                                                    <Link
                                                        href={buildInvoicesUrl({
                                                            month: toMonthParam(selectedMonthStart),
                                                            q,
                                                            status: statusFilter,
                                                            overdue: overdueOnly,
                                                            client: defaultClientId,
                                                            invoice: inv.id,
                                                        })}
                                                        className="inline-flex cursor-pointer items-center gap-2 underline-offset-4 transition hover:text-fuchsia-700 hover:underline"
                                                    >
                                                        {inv.invoice_number}
                                                    </Link>
                                                </TableCell>

                                                <TableCell className="text-muted-foreground">{inv.client_name ?? "—"}</TableCell>
                                                <TableCell className="text-muted-foreground">{inv.project_title ?? "—"}</TableCell>

                                                <TableCell>
                                                    <InvoiceStatusSelect
                                                        invoiceId={inv.id}
                                                        currentStatus={normalizedStatus}
                                                        onUpdate={updateInvoiceStatusAction}
                                                    />
                                                </TableCell>

                                                <TableCell className="text-muted-foreground">{fmtDate(inv.issue_date)}</TableCell>
                                                <TableCell className="text-muted-foreground">{fmtDate(inv.due_date)}</TableCell>
                                                <TableCell className="text-right">{money(inv.total)}</TableCell>

                                                <TableCell className="text-right">
                                                    <div className="flex items-center justify-end gap-2">
                                                        <Button
                                                            asChild
                                                            variant="outline"
                                                            size="icon"
                                                            className="cursor-pointer border-cyan-200 text-cyan-700 transition hover:border-cyan-300 hover:bg-cyan-50 hover:text-cyan-800"
                                                        >
                                                            <Link
                                                                href={buildInvoicesUrl({
                                                                    month: toMonthParam(selectedMonthStart),
                                                                    q,
                                                                    status: statusFilter,
                                                                    overdue: overdueOnly,
                                                                    client: defaultClientId,
                                                                    invoice: inv.id,
                                                                })}
                                                                aria-label={`Edit ${inv.invoice_number}`}
                                                            >
                                                                <Pencil className="h-4 w-4" />
                                                            </Link>
                                                        </Button>

                                                        {normalizedStatus !== "paid" ? (
                                                            <form
                                                                action={async () => {
                                                                    "use server";
                                                                    await markPaidAction(inv.id);
                                                                }}
                                                            >
                                                                <Button
                                                                    type="submit"
                                                                    variant="outline"
                                                                    size="icon"
                                                                    aria-label={`Mark ${inv.invoice_number} as paid`}
                                                                    className="cursor-pointer border-emerald-200 text-emerald-700 transition hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-800"
                                                                >
                                                                    <CheckCheck className="h-4 w-4" />
                                                                </Button>
                                                            </form>
                                                        ) : null}

                                                        <DeleteInvoiceButton
                                                            invoiceNumber={inv.invoice_number}
                                                            onDelete={async () => {
                                                                "use server";
                                                                return deleteInvoiceAction(inv.id);
                                                            }}
                                                            trigger={
                                                                <Button
                                                                    type="button"
                                                                    variant="outline"
                                                                    size="icon"
                                                                    aria-label={`Delete ${inv.invoice_number}`}
                                                                    className="cursor-pointer border-red-200 text-red-600 transition hover:border-red-300 hover:bg-red-50 hover:text-red-700"
                                                                >
                                                                    <Trash2 className="h-4 w-4" />
                                                                </Button>
                                                            }
                                                        />
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
