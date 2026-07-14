// FILE: src/app/(admin)/admin/leads/page.tsx
import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Globe, LayoutDashboard, Mail, Sparkles } from "lucide-react";

type LeadRow = {
    id: string;
    name: string;
    email: string;
    phone: string | null;
    message: string;
    source: string | null;
    status: string;
    created_at: string;
    closed_at: string | null;
};

function fmtDateTime(d: string) {
    try {
        return new Date(d).toLocaleString("en-ZA", {
            year: "numeric",
            month: "short",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
        });
    } catch {
        return d;
    }
}

function statusVariant(s: string) {
    const v = (s || "new").toLowerCase();
    if (v === "new") return "secondary";
    if (v === "contacted") return "outline";
    if (v === "closed") return "destructive";
    return "outline";
}

function clip(s: string, n = 80) {
    const t = (s || "").trim();
    if (t.length <= n) return t;
    return t.slice(0, n - 1) + "…";
}

export default async function AdminLeadsPage() {
    const supabase = await createClient();

    const { data: userRes } = await supabase.auth.getUser();
    if (!userRes?.user) redirect("/login");

    async function setLeadStatusAction(leadId: string, nextStatus: string) {
        "use server";

        const supabase = await createClient();

        const status = String(nextStatus ?? "").trim().toLowerCase();
        if (!["new", "contacted", "closed"].includes(status)) {
            return { ok: false, message: "Invalid status" };
        }

        const payload =
            status === "closed"
                ? { status, closed_at: new Date().toISOString() }
                : { status, closed_at: null };

        const { error } = await supabase.from("leads").update(payload).eq("id", leadId);
        if (error) return { ok: false, message: error.message };

        revalidatePath("/admin/leads");
        revalidatePath("/admin/reports");
        return { ok: true as const };
    }

    const { data, error } = await supabase
        .from("leads")
        .select("id,name,email,phone,message,source,status,created_at,closed_at")
        .order("created_at", { ascending: false })
        .limit(200);

    const leads = (data ?? []) as LeadRow[];
    const newCount = leads.filter((l) => (l.status || "new") === "new").length;

    return (
        <div className="space-y-6">
            <div className="rounded-3xl border border-white/10 bg-white/[0.06] p-6 text-white shadow-2xl backdrop-blur-xl">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                        <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-emerald-500/90 to-teal-600/90 px-3 py-1 text-xs font-medium text-white shadow-lg shadow-emerald-500/20">
                            <Mail className="h-3.5 w-3.5" />
                            Public lead inbox
                        </div>
                        <h1 className="text-2xl font-semibold tracking-tight">Leads</h1>
                        <p className="mt-1 text-sm text-white/65">
                            New inbound requests from the public landing page.
                        </p>
                    </div>

                    <div className="flex gap-2">
                        <Button asChild variant="outline" className="border-white/15 bg-white/5 text-white hover:bg-white/10 hover:text-white">
                            <Link href="/" className="flex items-center gap-2">
                                <Globe className="h-4 w-4" />
                                View public site
                            </Link>
                        </Button>

                        <Button asChild variant="outline" className="border-white/15 bg-white/5 text-white hover:bg-white/10 hover:text-white">
                            <Link href="/admin" className="flex items-center gap-2">
                                <LayoutDashboard className="h-4 w-4" />
                                Back to Dashboard
                            </Link>
                        </Button>
                    </div>
                </div>
            </div>

            <div className="flex flex-wrap gap-2">
                <Badge className="border-0 bg-gradient-to-r from-emerald-500 to-teal-600 text-white">
                    New: {newCount}
                </Badge>
                <Badge variant="outline" className="bg-white">
                    Total: {leads.length}
                </Badge>
            </div>

            <Card className="border-0 bg-white shadow-xl">
                <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <div>
                        <CardTitle>Inbox</CardTitle>
                        <CardDescription>Click status buttons to manage follow-ups.</CardDescription>
                    </div>

                    {error ? (
                        <Badge variant="destructive" className="w-fit">
                            DB Error
                        </Badge>
                    ) : (
                        <Badge className="w-fit border-0 bg-gradient-to-r from-emerald-500 to-teal-600 text-white">
                            <Sparkles className="mr-1 h-3.5 w-3.5" />
                            Live
                        </Badge>
                    )}
                </CardHeader>

                <CardContent>
                    {error ? (
                        <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
                            {error.message}
                        </div>
                    ) : leads.length === 0 ? (
                        <div className="rounded-xl border bg-background p-6">
                            <div className="text-sm font-medium">No leads yet</div>
                            <div className="mt-1 text-sm text-muted-foreground">
                                Submit the form on the landing page to test.
                            </div>
                        </div>
                    ) : (
                        <div className="rounded-xl border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Lead</TableHead>
                                        <TableHead>Message</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Closed</TableHead>
                                        <TableHead className="text-right">Received</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>

                                <TableBody>
                                    {leads.map((l) => (
                                        <TableRow key={l.id}>
                                            <TableCell className="align-top">
                                                <div className="font-medium">{l.name}</div>
                                                <div className="text-xs text-muted-foreground">{l.email}</div>
                                                {l.phone ? (
                                                    <div className="text-xs text-muted-foreground">{l.phone}</div>
                                                ) : null}
                                                {l.source ? (
                                                    <div className="mt-1 text-[11px] text-muted-foreground">
                                                        Source: {l.source}
                                                    </div>
                                                ) : null}
                                            </TableCell>

                                            <TableCell className="align-top text-sm text-muted-foreground">
                                                {clip(l.message, 140)}
                                            </TableCell>

                                            <TableCell className="align-top">
                                                <Badge variant={statusVariant(l.status)}>{l.status}</Badge>
                                            </TableCell>

                                            <TableCell className="align-top text-sm text-muted-foreground">
                                                {l.closed_at ? fmtDateTime(l.closed_at) : "—"}
                                            </TableCell>

                                            <TableCell className="align-top text-right text-sm text-muted-foreground">
                                                {fmtDateTime(l.created_at)}
                                            </TableCell>

                                            <TableCell className="align-top text-right">
                                                <div className="flex justify-end gap-2">
                                                    <form
                                                        action={async () => {
                                                            "use server";
                                                            await setLeadStatusAction(l.id, "new");
                                                        }}
                                                    >
                                                        <Button size="sm" variant="outline" type="submit">
                                                            New
                                                        </Button>
                                                    </form>

                                                    <form
                                                        action={async () => {
                                                            "use server";
                                                            await setLeadStatusAction(l.id, "contacted");
                                                        }}
                                                    >
                                                        <Button size="sm" variant="outline" type="submit">
                                                            Contacted
                                                        </Button>
                                                    </form>

                                                    <form
                                                        action={async () => {
                                                            "use server";
                                                            await setLeadStatusAction(l.id, "closed");
                                                        }}
                                                    >
                                                        <Button size="sm" variant="outline" type="submit">
                                                            Closed
                                                        </Button>
                                                    </form>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}