import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CalendarDays, Download, FileText, Pencil, Receipt, Sparkles } from "lucide-react";
import DeleteInvoiceButton from "@/components/admin/delete-invoice-button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

type PageProps = {
    params: Promise<{ id: string }>;
};

function money(v: any) {
    const n = Number(v ?? 0);
    return n.toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
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

export default async function EditInvoicePage({ params }: PageProps) {
    const { id } = await params;

    const supabase = await createClient();
    const { data: userRes } = await supabase.auth.getUser();
    if (!userRes?.user) redirect("/login");

    const { data: invoice, error } = await supabase
        .from("invoices")
        .select("id,client_id,project_id,invoice_number,status,issue_date,due_date,subtotal,tax,total,notes,created_at")
        .eq("id", id)
        .maybeSingle();

    if (error) {
        return (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
                {error.message}
            </div>
        );
    }
    if (!invoice) notFound();

    async function updateInvoiceAction(formData: FormData) {
        "use server";

        const supabase = await createClient();

        const issue_date = String(formData.get("issue_date") ?? "").trim();
        const due_date = String(formData.get("due_date") ?? "").trim();
        const status = normalizeStatus(String(formData.get("status") ?? "draft"));

        const subtotal = Number(formData.get("subtotal") ?? 0);
        const tax = Number(formData.get("tax") ?? 0);
        const notes = String(formData.get("notes") ?? "").trim() || null;

        if (!issue_date) return { ok: false, message: "Issue date is required." };
        if (!due_date) return { ok: false, message: "Due date is required." };
        if (!Number.isFinite(subtotal) || !Number.isFinite(tax)) {
            return { ok: false, message: "Subtotal and tax must be valid numbers." };
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
            .eq("id", id);

        if (error) return { ok: false, message: error.message };

        revalidatePath("/admin/invoices");
        revalidatePath("/admin");
        revalidatePath(`/admin/invoices/${id}/edit`);
        redirect("/admin/invoices");
    }

    async function deleteInvoiceAction() {
        "use server";

        const supabase = await createClient();

        const { error } = await supabase.from("invoices").delete().eq("id", id);
        if (error) return { ok: false, message: error.message };

        revalidatePath("/admin/invoices");
        revalidatePath("/admin");
        redirect("/admin/invoices");
    }

    return (
        <div className="space-y-6">
            <div className="relative overflow-hidden rounded-[28px] border border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(122,60,255,0.20),transparent_26%),radial-gradient(circle_at_top_right,rgba(0,229,255,0.14),transparent_28%),linear-gradient(180deg,#090914_0%,#0d0d18_100%)] p-6 text-white shadow-2xl shadow-fuchsia-950/20">
                <div className="absolute inset-0 opacity-25">
                    <div className="absolute left-[8%] top-[18%] h-56 w-56 rounded-full border border-white/10" />
                    <div className="absolute right-[10%] top-[18%] h-72 w-72 rounded-full border border-white/10" />
                    <div className="absolute bottom-[14%] left-[26%] h-44 w-44 rounded-full border border-white/10" />
                </div>

                <div className="relative flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div className="min-w-0">
                        <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs text-white/80 backdrop-blur">
                            <Pencil className="h-3.5 w-3.5 text-cyan-300" />
                            Invoice editor
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                            <h1 className="truncate text-2xl font-semibold tracking-tight">Edit Invoice</h1>
                            <Badge
                                variant={
                                    normalizeStatus(invoice.status) === "paid"
                                        ? "secondary"
                                        : normalizeStatus(invoice.status) === "overdue"
                                            ? "destructive"
                                            : "outline"
                                }
                            >
                                {prettyStatus(invoice.status)}
                            </Badge>
                        </div>
                        <p className="mt-2 text-sm text-white/70">{invoice.invoice_number}</p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                        <Button asChild variant="outline" className="border-white/15 bg-white/5 text-white hover:bg-white/10 hover:text-white">
                            <Link href="/admin/invoices">Back to Invoices</Link>
                        </Button>

                        <Button
                            asChild
                            className="border-0 bg-gradient-to-r from-fuchsia-500 to-purple-600 text-white hover:from-fuchsia-500/90 hover:to-purple-600/90"
                        >
                            <a href={`/api/invoices/${invoice.id}/pdf`} target="_blank" rel="noreferrer" className="flex items-center gap-2">
                                <Download className="h-4 w-4" />
                                Download PDF
                            </a>
                        </Button>
                    </div>
                </div>
            </div>

            <Card className="border-white/10 shadow-sm">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Receipt className="h-5 w-5 text-fuchsia-500" />
                        Invoice Details
                    </CardTitle>
                    <CardDescription>Update dates, status, and totals</CardDescription>
                </CardHeader>

                <CardContent className="space-y-6">
                    <form action={updateInvoiceAction} className="space-y-4">
                        <div className="grid gap-4 sm:grid-cols-2">
                            <div className="space-y-2">
                                <Label>Invoice Number</Label>
                                <Input value={invoice.invoice_number} readOnly />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="status">Status</Label>
                                <select
                                    id="status"
                                    name="status"
                                    defaultValue={normalizeStatus(invoice.status)}
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
                                <Label htmlFor="issue_date" className="flex items-center gap-2">
                                    <CalendarDays className="h-4 w-4 text-cyan-500" />
                                    Issue Date
                                </Label>
                                <Input id="issue_date" name="issue_date" type="date" defaultValue={invoice.issue_date} required />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="due_date" className="flex items-center gap-2">
                                    <CalendarDays className="h-4 w-4 text-fuchsia-500" />
                                    Due Date
                                </Label>
                                <Input id="due_date" name="due_date" type="date" defaultValue={invoice.due_date} required />
                            </div>
                        </div>

                        <div className="grid gap-4 sm:grid-cols-3">
                            <div className="space-y-2">
                                <Label htmlFor="subtotal">Subtotal</Label>
                                <Input id="subtotal" name="subtotal" type="number" step="0.01" defaultValue={invoice.subtotal ?? 0} required />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="tax">Tax</Label>
                                <Input id="tax" name="tax" type="number" step="0.01" defaultValue={invoice.tax ?? 0} required />
                            </div>
                            <div className="space-y-2">
                                <Label>Total (calc)</Label>
                                <Input value={money(invoice.total)} readOnly />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="notes" className="flex items-center gap-2">
                                <FileText className="h-4 w-4 text-purple-500" />
                                Notes
                            </Label>
                            <Textarea id="notes" name="notes" defaultValue={invoice.notes ?? ""} rows={4} />
                        </div>

                        <div className="flex flex-wrap gap-2">
                            <Button
                                type="submit"
                                className="border-0 bg-gradient-to-r from-fuchsia-500 to-purple-600 text-white hover:from-fuchsia-500/90 hover:to-purple-600/90"
                            >
                                Save Changes
                            </Button>
                            <Button asChild type="button" variant="outline">
                                <Link href="/admin/invoices">Cancel</Link>
                            </Button>
                        </div>
                    </form>

                    <div className="pt-2">
                        <div className="text-sm font-semibold">Danger zone</div>
                        <div className="mt-1 text-sm text-muted-foreground">
                            Deleting an invoice is permanent.
                        </div>
                        <div className="mt-3">
                            <DeleteInvoiceButton invoiceNumber={invoice.invoice_number} onDelete={deleteInvoiceAction} />
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}