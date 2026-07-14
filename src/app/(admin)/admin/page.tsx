// FILE: src/app/(admin)/admin/page.tsx
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import BusinessTrendCharts from "@/components/charts/business-trend-charts";
import {
    BarChart3,
    FolderKanban,
    Mail,
    Receipt,
    TrendingUp,
    Users,
    AlertTriangle,
    Clock3,
} from "lucide-react";

function money(v: any) {
    const n = Number(v ?? 0);
    return n.toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtDate(d: string | null) {
    if (!d) return "—";
    return new Date(d).toLocaleDateString("en-ZA", {
        year: "numeric",
        month: "short",
        day: "2-digit",
    });
}

function fmtDateTime(d: string | null) {
    if (!d) return "—";
    return new Date(d).toLocaleString("en-ZA", {
        year: "numeric",
        month: "short",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
    });
}

function addDaysISO(days: number) {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return d.toISOString().slice(0, 10);
}

function pad2(n: number) {
    return String(n).padStart(2, "0");
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

function monthShortLabelFromStartISO(isoStart: string) {
    const { y, m } = parseMonthStart(isoStart);
    const d = new Date(Date.UTC(y, m - 1, 1));
    return d.toLocaleDateString("en-ZA", { month: "short", year: "2-digit" });
}

function isoToUtcStart(d: string) {
    return `${d}T00:00:00.000Z`;
}

function isPaidStatus(s: any) {
    return String(s ?? "").trim().toLowerCase() === "paid";
}

function leadBadgeVariant(status?: string) {
    const s = (status || "new").toLowerCase();
    if (s === "new") return "secondary";
    if (s === "contacted") return "outline";
    if (s === "closed") return "destructive";
    return "outline";
}

async function buildTrendRow(supabase: any, monthStart: string) {
    const nextMonthStart = addMonthsStartISO(monthStart, 1);

    const [{ data: invRows }, { data: projRows }, { data: leadRows }] = await Promise.all([
        supabase
            .from("invoices")
            .select("id,status,total,due_date")
            .gte("due_date", monthStart)
            .lt("due_date", nextMonthStart)
            .neq("status", "cancelled"),

        supabase
            .from("projects")
            .select("id,created_at,completed_at")
            .lt("created_at", isoToUtcStart(nextMonthStart)),

        supabase
            .from("leads")
            .select("id,created_at,closed_at")
            .lt("created_at", isoToUtcStart(nextMonthStart)),
    ]);

    const invoices = (invRows ?? []) as { status: string; total: number }[];
    const invoice_total = invoices.reduce((s, r) => s + Number(r.total ?? 0), 0);
    const paid_total = invoices
        .filter((i) => isPaidStatus(i.status))
        .reduce((s, r) => s + Number(r.total ?? 0), 0);

    const projects = (projRows ?? []) as {
        created_at: string;
        completed_at: string | null;
    }[];

    const projects_opened = projects.filter(
        (p) =>
            p.created_at >= isoToUtcStart(monthStart) &&
            p.created_at < isoToUtcStart(nextMonthStart)
    ).length;

    const projects_completed = projects.filter(
        (p) =>
            !!p.completed_at &&
            p.completed_at >= isoToUtcStart(monthStart) &&
            p.completed_at < isoToUtcStart(nextMonthStart)
    ).length;

    const leads = (leadRows ?? []) as {
        created_at: string;
        closed_at: string | null;
    }[];

    const leads_received = leads.filter(
        (l) =>
            l.created_at >= isoToUtcStart(monthStart) &&
            l.created_at < isoToUtcStart(nextMonthStart)
    ).length;

    return {
        month: monthShortLabelFromStartISO(monthStart),
        invoice_total,
        paid_total,
        leads_received,
        projects_opened,
        projects_completed,
    };
}

export default async function AdminDashboardPage() {
    const supabase = await createClient();

    const { data: userRes } = await supabase.auth.getUser();
    if (!userRes?.user) redirect("/login");

    const todayIso = new Date().toISOString().slice(0, 10);
    const soonIso = addDaysISO(7);

    const now = new Date();
    const currentMonthStart = `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-01`;

    const [
        clientsCountRes,
        projectsRes,
        monthInvoicesRes,
        overdueInvoicesRes,
        dueSoonProjectsRes,
        leadsTotalCountRes,
        leadsNewCountRes,
        latestLeadsRes,
    ] = await Promise.all([
        supabase.from("clients").select("*", { count: "exact", head: true }),

        supabase.from("projects").select("id,status"),

        supabase
            .from("invoices")
            .select("id,total,status,due_date")
            .gte("due_date", currentMonthStart)
            .lt("due_date", addMonthsStartISO(currentMonthStart, 1))
            .neq("status", "cancelled"),

        supabase
            .from("invoices")
            .select("id,invoice_number,status,due_date,total,clients(name)")
            .neq("status", "paid")
            .neq("status", "cancelled")
            .lt("due_date", todayIso)
            .order("due_date", { ascending: true })
            .limit(5),

        supabase
            .from("projects")
            .select("id,title,status,priority,due_date,clients(name)")
            .not("due_date", "is", null)
            .gte("due_date", todayIso)
            .lte("due_date", soonIso)
            .order("due_date", { ascending: true })
            .limit(5),

        supabase.from("leads").select("*", { count: "exact", head: true }),
        supabase.from("leads").select("*", { count: "exact", head: true }).eq("status", "new"),

        supabase
            .from("leads")
            .select("id,name,email,phone,message,status,created_at,source")
            .order("created_at", { ascending: false })
            .limit(5),
    ]);

    const clientCount = clientsCountRes.count ?? 0;

    const projRows = (projectsRes.data ?? []) as { status: string }[];
    const activeProjects = projRows.filter((p) => p.status !== "done").length;

    const monthInvRows = (monthInvoicesRes.data ?? []) as { total: number; status: string; due_date: string }[];
    const expectedMonthlyIncome = monthInvRows.reduce((sum, r) => sum + Number(r.total ?? 0), 0);

    const overdueInvoices = (overdueInvoicesRes.data ?? []) as any[];
    const dueSoonProjects = (dueSoonProjectsRes.data ?? []) as any[];

    const leadsTotal = leadsTotalCountRes.count ?? 0;
    const newLeadsCount = leadsNewCountRes.count ?? 0;
    const latestLeads = (latestLeadsRes.data ?? []) as any[];

    const trendMonths = [
        addMonthsStartISO(currentMonthStart, -5),
        addMonthsStartISO(currentMonthStart, -4),
        addMonthsStartISO(currentMonthStart, -3),
        addMonthsStartISO(currentMonthStart, -2),
        addMonthsStartISO(currentMonthStart, -1),
        currentMonthStart,
    ];

    const trendData = await Promise.all(trendMonths.map((m) => buildTrendRow(supabase, m)));

    return (
        <div className="space-y-6">
            <div className="rounded-3xl border border-white/10 bg-white/[0.06] p-6 text-white shadow-2xl backdrop-blur-xl">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                        <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-fuchsia-500/90 via-purple-500/90 to-cyan-400/90 px-3 py-1 text-xs font-medium text-white shadow-lg shadow-fuchsia-500/20">
                            <BarChart3 className="h-3.5 w-3.5" />
                            Live business overview
                        </div>
                        <h1 className="text-2xl font-semibold tracking-tight">Overview</h1>
                        <p className="mt-1 text-sm text-white/65">
                            Live snapshot + what needs attention.
                        </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                        <Button asChild className="border-0 bg-gradient-to-r from-cyan-500 to-blue-600 text-white hover:from-cyan-500 hover:to-blue-600">
                            <Link href="/admin/clients" className="flex items-center gap-2">
                                <Users className="h-4 w-4" />
                                Clients
                            </Link>
                        </Button>

                        <Button asChild className="border-0 bg-gradient-to-r from-fuchsia-500 to-purple-600 text-white hover:from-fuchsia-500 hover:to-purple-600">
                            <Link href="/admin/projects" className="flex items-center gap-2">
                                <FolderKanban className="h-4 w-4" />
                                Projects
                            </Link>
                        </Button>

                        <Button asChild className="border-0 bg-gradient-to-r from-violet-500 to-indigo-600 text-white hover:from-violet-500 hover:to-indigo-600">
                            <Link href="/admin/invoices" className="flex items-center gap-2">
                                <Receipt className="h-4 w-4" />
                                Invoices
                            </Link>
                        </Button>

                        <Button asChild className="border-0 bg-gradient-to-r from-emerald-500 to-teal-600 text-white hover:from-emerald-500 hover:to-teal-600">
                            <Link href="/admin/leads" className="flex items-center gap-2">
                                <Mail className="h-4 w-4" />
                                Leads
                            </Link>
                        </Button>
                    </div>
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card className="border-0 bg-white shadow-xl">
                    <CardHeader className="pb-2">
                        <CardTitle className="flex items-center gap-2 text-sm font-medium">
                            <Users className="h-4 w-4 text-cyan-600" />
                            Clients
                        </CardTitle>
                        <CardDescription>Total registered</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-semibold">{clientCount}</div>
                        <div className="mt-1 text-xs text-muted-foreground">Live</div>
                    </CardContent>
                </Card>

                <Card className="border-0 bg-white shadow-xl">
                    <CardHeader className="pb-2">
                        <CardTitle className="flex items-center gap-2 text-sm font-medium">
                            <FolderKanban className="h-4 w-4 text-fuchsia-600" />
                            Active Projects
                        </CardTitle>
                        <CardDescription>Not marked done</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-semibold">{activeProjects}</div>
                        <div className="mt-1 text-xs text-muted-foreground">Live</div>
                    </CardContent>
                </Card>

                <Card className="border-0 bg-white shadow-xl">
                    <CardHeader className="pb-2">
                        <CardTitle className="flex items-center gap-2 text-sm font-medium">
                            <TrendingUp className="h-4 w-4 text-violet-600" />
                            Estimated monthly expected income
                        </CardTitle>
                        <CardDescription>
                            Invoices due in {now.toLocaleDateString("en-ZA", { month: "long", year: "numeric" })}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-semibold">R {money(expectedMonthlyIncome)}</div>
                        <div className="mt-1 text-xs text-muted-foreground">Based on due date (excludes cancelled)</div>
                    </CardContent>
                </Card>

                <Card className="border-0 bg-white shadow-xl">
                    <CardHeader className="pb-2">
                        <CardTitle className="flex items-center gap-2 text-sm font-medium">
                            <Mail className="h-4 w-4 text-emerald-600" />
                            Leads
                        </CardTitle>
                        <CardDescription>Total leads in inbox</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-semibold">{leadsTotal}</div>
                        <div className="mt-1 text-xs text-muted-foreground">New: {newLeadsCount}</div>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
                <Card className="border-0 bg-white shadow-xl lg:col-span-1">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <AlertTriangle className="h-5 w-5 text-red-500" />
                            Overdue invoices
                        </CardTitle>
                        <CardDescription>Top 5 by earliest due date</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        {overdueInvoices.length === 0 ? (
                            <div className="rounded-xl border bg-background p-4 text-sm text-muted-foreground">
                                No overdue invoices 🎉
                            </div>
                        ) : (
                            overdueInvoices.map((inv) => (
                                <Link
                                    key={inv.id}
                                    href={`/admin/invoices/${inv.id}/edit`}
                                    className="block rounded-xl border bg-background p-3 transition-colors hover:bg-accent/40"
                                >
                                    <div className="flex items-center justify-between gap-3">
                                        <div className="min-w-0">
                                            <div className="truncate text-sm font-medium">
                                                {inv.invoice_number} • {inv.clients?.name ?? "—"}
                                            </div>
                                            <div className="text-xs text-muted-foreground">Due: {fmtDate(inv.due_date)}</div>
                                        </div>
                                        <div className="text-right">
                                            <Badge variant="destructive">overdue</Badge>
                                            <div className="mt-1 text-xs text-muted-foreground">R {money(inv.total)}</div>
                                        </div>
                                    </div>
                                </Link>
                            ))
                        )}

                        <div className="pt-2">
                            <Button asChild variant="outline" className="w-full">
                                <Link href="/admin/invoices">View all invoices</Link>
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-0 bg-white shadow-xl lg:col-span-1">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Clock3 className="h-5 w-5 text-fuchsia-500" />
                            Projects due soon
                        </CardTitle>
                        <CardDescription>Next 7 days (top 5)</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        {dueSoonProjects.length === 0 ? (
                            <div className="rounded-xl border bg-background p-4 text-sm text-muted-foreground">
                                No projects due in the next 7 days.
                            </div>
                        ) : (
                            dueSoonProjects.map((p) => (
                                <Link
                                    key={p.id}
                                    href={`/admin/projects/${p.id}/edit`}
                                    className="block rounded-xl border bg-background p-3 transition-colors hover:bg-accent/40"
                                >
                                    <div className="flex items-center justify-between gap-3">
                                        <div className="min-w-0">
                                            <div className="truncate text-sm font-medium">
                                                {p.title} • {p.clients?.name ?? "—"}
                                            </div>
                                            <div className="text-xs text-muted-foreground">Due: {fmtDate(p.due_date)}</div>
                                        </div>
                                        <div className="text-right">
                                            <Badge variant="secondary">{p.status}</Badge>
                                            <div className="mt-1 text-xs text-muted-foreground">{p.priority}</div>
                                        </div>
                                    </div>
                                </Link>
                            ))
                        )}

                        <div className="pt-2">
                            <Button asChild variant="outline" className="w-full">
                                <Link href="/admin/projects">View all projects</Link>
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-0 bg-white shadow-xl lg:col-span-1">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Mail className="h-5 w-5 text-emerald-500" />
                            Latest leads
                        </CardTitle>
                        <CardDescription>Top 5 newest submissions</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        {latestLeads.length === 0 ? (
                            <div className="rounded-xl border bg-background p-4 text-sm text-muted-foreground">
                                No leads yet. Submit the form on the landing page to test.
                            </div>
                        ) : (
                            latestLeads.map((l: any) => (
                                <div key={l.id} className="rounded-xl border bg-background p-3">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0">
                                            <div className="truncate text-sm font-medium">{l.name}</div>
                                            <div className="truncate text-xs text-muted-foreground">
                                                <a className="hover:underline" href={`mailto:${l.email}`}>
                                                    {l.email}
                                                </a>
                                                {l.phone ? ` • ${l.phone}` : ""}
                                            </div>
                                            <div className="mt-1 text-xs text-muted-foreground">
                                                {fmtDateTime(l.created_at)}{l.source ? ` • ${l.source}` : ""}
                                            </div>
                                            <div className="mt-2 text-xs text-muted-foreground">
                                                {(String(l.message ?? "").trim().length > 120)
                                                    ? String(l.message).trim().slice(0, 119) + "…"
                                                    : String(l.message ?? "").trim() || "—"}
                                            </div>
                                        </div>

                                        <Badge variant={leadBadgeVariant(l.status)} className="shrink-0">
                                            {l.status ?? "new"}
                                        </Badge>
                                    </div>
                                </div>
                            ))
                        )}

                        <div className="pt-2">
                            <Button asChild variant="outline" className="w-full">
                                <Link href="/admin/leads">Open leads inbox</Link>
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Card className="border-0 bg-white shadow-xl">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <BarChart3 className="h-5 w-5 text-violet-600" />
                        6-Month Trend Summary
                    </CardTitle>
                    <CardDescription>Pattern view from the dashboard.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="overflow-x-auto rounded-xl border">
                        <table className="min-w-full text-sm">
                            <thead>
                                <tr className="border-b bg-muted/30">
                                    <th className="px-4 py-3 text-left font-medium">Month</th>
                                    <th className="px-4 py-3 text-left font-medium">Invoice Total</th>
                                    <th className="px-4 py-3 text-left font-medium">Paid Total</th>
                                    <th className="px-4 py-3 text-left font-medium">Leads Received</th>
                                    <th className="px-4 py-3 text-left font-medium">Projects Opened</th>
                                    <th className="px-4 py-3 text-left font-medium">Projects Completed</th>
                                </tr>
                            </thead>
                            <tbody>
                                {trendData.map((row) => (
                                    <tr key={row.month} className="border-b last:border-0">
                                        <td className="px-4 py-3">{row.month}</td>
                                        <td className="px-4 py-3">R {money(row.invoice_total)}</td>
                                        <td className="px-4 py-3">R {money(row.paid_total)}</td>
                                        <td className="px-4 py-3">{row.leads_received}</td>
                                        <td className="px-4 py-3">{row.projects_opened}</td>
                                        <td className="px-4 py-3">{row.projects_completed}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <BusinessTrendCharts data={trendData} showRevenue showLeads showProjects />
                </CardContent>
            </Card>
        </div>
    );
}