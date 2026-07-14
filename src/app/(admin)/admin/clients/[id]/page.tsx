import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
    ArrowLeft,
    Briefcase,
    FileText,
    Mail,
    Phone,
    User2,
    Users,
    Pencil,
} from "lucide-react";

type PageProps = {
    params: Promise<{ id: string }>;
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

export default async function ClientDetailPage({ params }: PageProps) {
    const { id } = await params;
    const supabase = await createClient();

    const { data: userRes } = await supabase.auth.getUser();
    if (!userRes?.user) redirect("/login");

    const { data: client, error: clientError } = await supabase
        .from("clients")
        .select("id,name,contact_person,email,phone,notes,status,created_at")
        .eq("id", id)
        .maybeSingle();

    if (clientError) {
        return (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
                {clientError.message}
            </div>
        );
    }

    if (!client) notFound();

    const [{ data: projects }, { data: invoices }] = await Promise.all([
        supabase
            .from("projects")
            .select("id,title,status,priority,due_date,created_at")
            .eq("client_id", id)
            .order("created_at", { ascending: false }),
        supabase
            .from("invoices")
            .select("id,invoice_number,status,issue_date,due_date,total,created_at,projects(title)")
            .eq("client_id", id)
            .order("created_at", { ascending: false }),
    ]);

    const projectRows = (projects ?? []) as any[];
    const invoiceRows = (invoices ?? []) as any[];

    return (
        <div className="space-y-6">
            <div className="rounded-3xl border border-white/10 bg-white/[0.06] p-6 text-white shadow-2xl backdrop-blur-xl">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div className="min-w-0">
                        <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-cyan-500/90 to-blue-600/90 px-3 py-1 text-xs font-medium text-white shadow-lg shadow-cyan-500/20">
                            <Users className="h-3.5 w-3.5" />
                            Client profile
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                            <h1 className="truncate text-2xl font-semibold tracking-tight">{client.name}</h1>
                            <Badge
                                className={
                                    client.status === "active"
                                        ? "border-0 bg-gradient-to-r from-emerald-500 to-teal-600 text-white"
                                        : ""
                                }
                                variant={client.status === "active" ? "secondary" : "outline"}
                            >
                                {client.status}
                            </Badge>
                        </div>

                        <p className="mt-1 text-sm text-white/65">
                            Client profile, projects, and invoices
                        </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                        <Button asChild variant="outline" className="border-white/15 bg-white/5 text-white hover:bg-white/10 hover:text-white">
                            <Link href="/admin/clients" className="flex items-center gap-2">
                                <ArrowLeft className="h-4 w-4" />
                                Back to Clients
                            </Link>
                        </Button>
                    </div>
                </div>
            </div>

            <Card className="border-0 bg-white shadow-xl">
                <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <div>
                        <CardTitle>Client Info</CardTitle>
                        <CardDescription>Contact and notes</CardDescription>
                    </div>

                    <div className="flex flex-wrap gap-2">
                        <Button asChild variant="outline">
                            <Link href={`/admin/clients/${client.id}/edit`} className="flex items-center gap-2">
                                <Pencil className="h-4 w-4" />
                                Edit
                            </Link>
                        </Button>

                        <Button asChild className="border-0 bg-gradient-to-r from-fuchsia-500 to-purple-600 text-white hover:from-fuchsia-500 hover:to-purple-600">
                            <Link href={`/admin/projects?client=${client.id}`} className="flex items-center gap-2">
                                <Briefcase className="h-4 w-4" />
                                Add Project
                            </Link>
                        </Button>

                        <Button asChild className="border-0 bg-gradient-to-r from-violet-500 to-indigo-600 text-white hover:from-violet-500 hover:to-indigo-600">
                            <Link href={`/admin/invoices?client=${client.id}`} className="flex items-center gap-2">
                                <FileText className="h-4 w-4" />
                                Create Invoice
                            </Link>
                        </Button>
                    </div>
                </CardHeader>

                <CardContent className="grid gap-4 md:grid-cols-2">
                    <div className="rounded-xl border bg-background p-4">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <User2 className="h-3.5 w-3.5" />
                            Contact Person
                        </div>
                        <div className="mt-1 text-sm font-medium">{client.contact_person ?? "—"}</div>

                        <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
                            <Mail className="h-3.5 w-3.5" />
                            Email
                        </div>
                        <div className="mt-1 text-sm">{client.email ?? "—"}</div>

                        <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
                            <Phone className="h-3.5 w-3.5" />
                            Phone
                        </div>
                        <div className="mt-1 text-sm">{client.phone ?? "—"}</div>
                    </div>

                    <div className="rounded-xl border bg-background p-4">
                        <div className="text-xs text-muted-foreground">Created</div>
                        <div className="mt-1 text-sm">{fmtDate(client.created_at)}</div>

                        <div className="mt-4 text-xs text-muted-foreground">Notes</div>
                        <div className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">
                            {client.notes ?? "—"}
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Tabs defaultValue="projects" className="space-y-4">
                <TabsList className="bg-white shadow-sm">
                    <TabsTrigger value="projects">Projects ({projectRows.length})</TabsTrigger>
                    <TabsTrigger value="invoices">Invoices ({invoiceRows.length})</TabsTrigger>
                </TabsList>

                <TabsContent value="projects">
                    <Card className="border-0 bg-white shadow-xl">
                        <CardHeader>
                            <CardTitle>Projects</CardTitle>
                            <CardDescription>All projects linked to this client</CardDescription>
                        </CardHeader>

                        <CardContent>
                            {projectRows.length === 0 ? (
                                <div className="rounded-xl border bg-background p-6">
                                    <div className="text-sm font-medium">No projects yet</div>
                                    <div className="mt-1 text-sm text-muted-foreground">
                                        Add a project and track progress here.
                                    </div>
                                </div>
                            ) : (
                                <div className="rounded-xl border">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Title</TableHead>
                                                <TableHead>Status</TableHead>
                                                <TableHead>Priority</TableHead>
                                                <TableHead>Due</TableHead>
                                                <TableHead className="text-right">Created</TableHead>
                                            </TableRow>
                                        </TableHeader>

                                        <TableBody>
                                            {projectRows.map((p) => (
                                                <TableRow key={p.id}>
                                                    <TableCell className="font-medium">{p.title}</TableCell>
                                                    <TableCell>
                                                        <Badge variant="secondary">{p.status}</Badge>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge variant="outline">{p.priority}</Badge>
                                                    </TableCell>
                                                    <TableCell className="text-muted-foreground">{fmtDate(p.due_date)}</TableCell>
                                                    <TableCell className="text-right text-muted-foreground">
                                                        {fmtDate(p.created_at)}
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="invoices">
                    <Card className="border-0 bg-white shadow-xl">
                        <CardHeader>
                            <CardTitle>Invoices</CardTitle>
                            <CardDescription>All invoices linked to this client</CardDescription>
                        </CardHeader>

                        <CardContent>
                            {invoiceRows.length === 0 ? (
                                <div className="rounded-xl border bg-background p-6">
                                    <div className="text-sm font-medium">No invoices yet</div>
                                    <div className="mt-1 text-sm text-muted-foreground">
                                        Create an invoice and track status here.
                                    </div>
                                </div>
                            ) : (
                                <div className="rounded-xl border">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>#</TableHead>
                                                <TableHead>Project</TableHead>
                                                <TableHead>Status</TableHead>
                                                <TableHead>Issue</TableHead>
                                                <TableHead>Due</TableHead>
                                                <TableHead className="text-right">Total (R)</TableHead>
                                            </TableRow>
                                        </TableHeader>

                                        <TableBody>
                                            {invoiceRows.map((inv) => (
                                                <TableRow key={inv.id}>
                                                    <TableCell className="font-medium">{inv.invoice_number}</TableCell>
                                                    <TableCell className="text-muted-foreground">
                                                        {inv.projects?.title ?? "—"}
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge
                                                            variant={
                                                                inv.status === "paid"
                                                                    ? "secondary"
                                                                    : inv.status === "overdue"
                                                                        ? "destructive"
                                                                        : "outline"
                                                            }
                                                        >
                                                            {inv.status}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="text-muted-foreground">
                                                        {fmtDate(inv.issue_date)}
                                                    </TableCell>
                                                    <TableCell className="text-muted-foreground">
                                                        {fmtDate(inv.due_date)}
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        {money(inv.total)}
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}