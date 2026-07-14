// FILE: src/app/(admin)/admin/reports/page.tsx
import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
    CalendarRange,
    Download,
    FileBarChart,
    FolderKanban,
    Receipt,
    Sparkles,
    TrendingUp,
    Users,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import ReportsTrendCharts from "@/components/admin/reports-trend-charts";
import ReportsGenerateButton from "@/components/admin/reports-generate-button";
import ReportsMonthNav from "@/components/admin/reports-month-nav";

type PageProps = {
    searchParams?: Promise<{ month?: string }>;
};

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

function monthLabelFromStartISO(isoStart: string) {
    const { y, m } = parseMonthStart(isoStart);
    const d = new Date(Date.UTC(y, m - 1, 1));
    return d.toLocaleDateString("en-ZA", { month: "long", year: "numeric" });
}

function monthShortLabelFromStartISO(isoStart: string) {
    const { y, m } = parseMonthStart(isoStart);
    const d = new Date(Date.UTC(y, m - 1, 1));
    return d.toLocaleDateString("en-ZA", { month: "short", year: "2-digit" });
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

function toMonthParam(isoStart: string) {
    return isoStart.slice(0, 7);
}

function money(v: any) {
    const n = Number(v ?? 0);
    return n.toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function isoToUtcStart(d: string) {
    return `${d}T00:00:00.000Z`;
}

function isPaidStatus(s: any) {
    return String(s ?? "").trim().toLowerCase() === "paid";
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

export default async function ReportsPage({ searchParams }: PageProps) {
    const sp = (await searchParams) ?? {};
    const supabase = await createClient();

    const { data: userRes } = await supabase.auth.getUser();
    if (!userRes?.user) redirect("/login");

    const now = new Date();
    const currentMonthStart = `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-01`;

    const selectedStart = monthStartISOFromParam(sp.month) ?? currentMonthStart;
    const nextMonthStart = addMonthsStartISO(selectedStart, 1);
    const prevMonthStart = addMonthsStartISO(selectedStart, -1);

    const { y: selectedYear } = parseMonthStart(selectedStart);
    const yearStart = `${selectedYear}-01-01`;

    const { data: periodRow } = await supabase
        .from("reporting_periods")
        .select("status,generated_at")
        .eq("period_start", selectedStart)
        .maybeSingle();

    const periodStatus = (periodRow?.status ?? "open") as "open" | "closed";
    const isClosed = periodStatus === "closed";

    const { data: invRows, error: invErr } = await supabase
        .from("invoices")
        .select("id,status,total,due_date")
        .gte("due_date", selectedStart)
        .lt("due_date", nextMonthStart)
        .neq("status", "cancelled");

    const invoices = (invRows ?? []) as { status: string; total: number }[];
    const invoicesCount = invoices.length;
    const invoicesTotal = invoices.reduce((s, r) => s + Number(r.total ?? 0), 0);
    const paidTotal = invoices.filter((i) => isPaidStatus(i.status)).reduce((s, r) => s + Number(r.total ?? 0), 0);
    const unpaidTotal = invoices.filter((i) => !isPaidStatus(i.status)).reduce((s, r) => s + Number(r.total ?? 0), 0);
    const paidCount = invoices.filter((i) => isPaidStatus(i.status)).length;
    const unpaidCount = invoices.filter((i) => !isPaidStatus(i.status)).length;

    const { data: projRows, error: projErr } = await supabase
        .from("projects")
        .select("id,status,created_at,completed_at")
        .lt("created_at", isoToUtcStart(nextMonthStart));

    const projects = (projRows ?? []) as {
        status: string;
        created_at: string;
        completed_at: string | null;
    }[];

    const projectsOpened = projects.filter(
        (p) => p.created_at >= isoToUtcStart(selectedStart) && p.created_at < isoToUtcStart(nextMonthStart)
    ).length;

    const projectsCompleted = projects.filter(
        (p) => !!p.completed_at && p.completed_at >= isoToUtcStart(selectedStart) && p.completed_at < isoToUtcStart(nextMonthStart)
    ).length;

    const projectsActiveDuringMonth = projects.filter((p) => {
        const createdBeforeMonthEnd = p.created_at < isoToUtcStart(nextMonthStart);
        const notCompletedBeforeMonthStart = !p.completed_at || p.completed_at >= isoToUtcStart(selectedStart);
        return createdBeforeMonthEnd && notCompletedBeforeMonthStart;
    }).length;

    const { data: leadRows, error: leadErr } = await supabase
        .from("leads")
        .select("id,status,created_at,closed_at")
        .lt("created_at", isoToUtcStart(nextMonthStart));

    const leads = (leadRows ?? []) as {
        status: string;
        created_at: string;
        closed_at: string | null;
    }[];

    const leadsReceived = leads.filter(
        (l) => l.created_at >= isoToUtcStart(selectedStart) && l.created_at < isoToUtcStart(nextMonthStart)
    ).length;

    const leadsClosed = leads.filter(
        (l) => !!l.closed_at && l.closed_at >= isoToUtcStart(selectedStart) && l.closed_at < isoToUtcStart(nextMonthStart)
    ).length;

    const leadsActiveDuringMonth = leads.filter((l) => {
        const createdBeforeMonthEnd = l.created_at < isoToUtcStart(nextMonthStart);
        const notClosedBeforeMonthStart = !l.closed_at || l.closed_at >= isoToUtcStart(selectedStart);
        return createdBeforeMonthEnd && notClosedBeforeMonthStart;
    }).length;

    const leadsNew = leads.filter(
        (l) =>
            (l.status ?? "new") === "new" &&
            l.created_at >= isoToUtcStart(selectedStart) &&
            l.created_at < isoToUtcStart(nextMonthStart)
    ).length;

    const leadsContacted = leads.filter(
        (l) =>
            l.status === "contacted" &&
            l.created_at >= isoToUtcStart(selectedStart) &&
            l.created_at < isoToUtcStart(nextMonthStart)
    ).length;

    const [{ data: ytdInvRows }, { data: ytdProjRows }, { data: ytdLeadRows }] = await Promise.all([
        supabase
            .from("invoices")
            .select("id,status,total,due_date")
            .gte("due_date", yearStart)
            .lt("due_date", nextMonthStart)
            .neq("status", "cancelled"),

        supabase
            .from("projects")
            .select("id,status,created_at,completed_at")
            .lt("created_at", isoToUtcStart(nextMonthStart)),

        supabase
            .from("leads")
            .select("id,status,created_at,closed_at")
            .lt("created_at", isoToUtcStart(nextMonthStart)),
    ]);

    const ytdInvoices = (ytdInvRows ?? []) as { status: string; total: number }[];
    const ytdInvCount = ytdInvoices.length;
    const ytdInvTotal = ytdInvoices.reduce((s, r) => s + Number(r.total ?? 0), 0);
    const ytdPaidCount = ytdInvoices.filter((i) => isPaidStatus(i.status)).length;
    const ytdPaidTotal = ytdInvoices.filter((i) => isPaidStatus(i.status)).reduce((s, r) => s + Number(r.total ?? 0), 0);
    const ytdUnpaidCount = ytdInvoices.filter((i) => !isPaidStatus(i.status)).length;
    const ytdUnpaidTotal = ytdInvoices.filter((i) => !isPaidStatus(i.status)).reduce((s, r) => s + Number(r.total ?? 0), 0);

    const ytdProjects = (ytdProjRows ?? []) as {
        status: string;
        created_at: string;
        completed_at: string | null;
    }[];

    const ytdProjectsOpened = ytdProjects.filter(
        (p) => p.created_at >= isoToUtcStart(yearStart) && p.created_at < isoToUtcStart(nextMonthStart)
    ).length;

    const ytdProjectsCompleted = ytdProjects.filter(
        (p) => !!p.completed_at && p.completed_at >= isoToUtcStart(yearStart) && p.completed_at < isoToUtcStart(nextMonthStart)
    ).length;

    const ytdProjectsActive = ytdProjects.filter((p) => {
        const createdBeforeRangeEnd = p.created_at < isoToUtcStart(nextMonthStart);
        const notCompletedBeforeYearStart = !p.completed_at || p.completed_at >= isoToUtcStart(yearStart);
        return createdBeforeRangeEnd && notCompletedBeforeYearStart;
    }).length;

    const ytdLeads = (ytdLeadRows ?? []) as {
        status: string;
        created_at: string;
        closed_at: string | null;
    }[];

    const ytdLeadsReceived = ytdLeads.filter(
        (l) => l.created_at >= isoToUtcStart(yearStart) && l.created_at < isoToUtcStart(nextMonthStart)
    ).length;

    const ytdLeadsClosed = ytdLeads.filter(
        (l) => !!l.closed_at && l.closed_at >= isoToUtcStart(yearStart) && l.closed_at < isoToUtcStart(nextMonthStart)
    ).length;

    const ytdLeadsActive = ytdLeads.filter((l) => {
        const createdBeforeRangeEnd = l.created_at < isoToUtcStart(nextMonthStart);
        const notClosedBeforeYearStart = !l.closed_at || l.closed_at >= isoToUtcStart(yearStart);
        return createdBeforeRangeEnd && notClosedBeforeYearStart;
    }).length;

    const { data: snapshotRow } = await supabase
        .from("monthly_reports")
        .select("created_at,summary")
        .eq("period_start", selectedStart)
        .maybeSingle();

    async function generateReportAction(formData: FormData) {
        "use server";

        const supabase = await createClient();

        const period_start = String(formData.get("period_start") ?? "").trim();
        if (!/^\d{4}-\d{2}-\d{2}$/.test(period_start)) {
            return { ok: false, message: "Invalid period_start" };
        }

        const next_start = addMonthsStartISO(period_start, 1);
        const selectedYear = Number(period_start.slice(0, 4));
        const year_start = `${selectedYear}-01-01`;

        const [
            { data: inv, error: invE },
            { data: proj, error: projE },
            { data: leads, error: leadE },
            { data: yInv },
            { data: yProj },
            { data: yLeads },
        ] = await Promise.all([
            supabase
                .from("invoices")
                .select("id,status,total,due_date")
                .gte("due_date", period_start)
                .lt("due_date", next_start)
                .neq("status", "cancelled"),

            supabase
                .from("projects")
                .select("id,status,created_at,completed_at")
                .lt("created_at", isoToUtcStart(next_start)),

            supabase
                .from("leads")
                .select("id,status,created_at,closed_at")
                .lt("created_at", isoToUtcStart(next_start)),

            supabase
                .from("invoices")
                .select("id,status,total,due_date")
                .gte("due_date", year_start)
                .lt("due_date", next_start)
                .neq("status", "cancelled"),

            supabase
                .from("projects")
                .select("id,status,created_at,completed_at")
                .lt("created_at", isoToUtcStart(next_start)),

            supabase
                .from("leads")
                .select("id,status,created_at,closed_at")
                .lt("created_at", isoToUtcStart(next_start)),
        ]);

        if (invE || projE || leadE) {
            return {
                ok: false,
                message: invE?.message || projE?.message || leadE?.message || "Failed to generate report",
            };
        }

        const invRows = (inv ?? []) as { status: string; total: number }[];
        const invoicesCount = invRows.length;
        const invoicesTotal = invRows.reduce((s, r) => s + Number(r.total ?? 0), 0);
        const paidTotal = invRows.filter((i) => isPaidStatus(i.status)).reduce((s, r) => s + Number(r.total ?? 0), 0);
        const unpaidTotal = invRows.filter((i) => !isPaidStatus(i.status)).reduce((s, r) => s + Number(r.total ?? 0), 0);
        const paidCount = invRows.filter((i) => isPaidStatus(i.status)).length;
        const unpaidCount = invRows.filter((i) => !isPaidStatus(i.status)).length;

        const projRows = (proj ?? []) as { created_at: string; completed_at: string | null }[];
        const projectsOpened = projRows.filter(
            (p) => p.created_at >= isoToUtcStart(period_start) && p.created_at < isoToUtcStart(next_start)
        ).length;
        const projectsCompleted = projRows.filter(
            (p) => !!p.completed_at && p.completed_at >= isoToUtcStart(period_start) && p.completed_at < isoToUtcStart(next_start)
        ).length;
        const projectsActive = projRows.filter((p) => {
            const createdBeforeMonthEnd = p.created_at < isoToUtcStart(next_start);
            const notCompletedBeforeMonthStart = !p.completed_at || p.completed_at >= isoToUtcStart(period_start);
            return createdBeforeMonthEnd && notCompletedBeforeMonthStart;
        }).length;

        const leadRows = (leads ?? []) as { status: string; created_at: string; closed_at: string | null }[];
        const leadsReceived = leadRows.filter(
            (l) => l.created_at >= isoToUtcStart(period_start) && l.created_at < isoToUtcStart(next_start)
        ).length;
        const leadsClosed = leadRows.filter(
            (l) => !!l.closed_at && l.closed_at >= isoToUtcStart(period_start) && l.closed_at < isoToUtcStart(next_start)
        ).length;
        const leadsActive = leadRows.filter((l) => {
            const createdBeforeMonthEnd = l.created_at < isoToUtcStart(next_start);
            const notClosedBeforeMonthStart = !l.closed_at || l.closed_at >= isoToUtcStart(period_start);
            return createdBeforeMonthEnd && notClosedBeforeMonthStart;
        }).length;
        const leadsNew = leadRows.filter(
            (l) =>
                (l.status ?? "new") === "new" &&
                l.created_at >= isoToUtcStart(period_start) &&
                l.created_at < isoToUtcStart(next_start)
        ).length;
        const leadsContacted = leadRows.filter(
            (l) =>
                l.status === "contacted" &&
                l.created_at >= isoToUtcStart(period_start) &&
                l.created_at < isoToUtcStart(next_start)
        ).length;

        const yInvRows = (yInv ?? []) as { status: string; total: number }[];
        const ytd_inv_count = yInvRows.length;
        const ytd_inv_total = yInvRows.reduce((s, r) => s + Number(r.total ?? 0), 0);
        const ytd_paid_count = yInvRows.filter((i) => isPaidStatus(i.status)).length;
        const ytd_paid_total = yInvRows.filter((i) => isPaidStatus(i.status)).reduce((s, r) => s + Number(r.total ?? 0), 0);
        const ytd_unpaid_count = yInvRows.filter((i) => !isPaidStatus(i.status)).length;
        const ytd_unpaid_total = yInvRows.filter((i) => !isPaidStatus(i.status)).reduce((s, r) => s + Number(r.total ?? 0), 0);

        const yProjRows = (yProj ?? []) as { created_at: string; completed_at: string | null }[];
        const ytd_projects_opened = yProjRows.filter(
            (p) => p.created_at >= isoToUtcStart(year_start) && p.created_at < isoToUtcStart(next_start)
        ).length;
        const ytd_projects_completed = yProjRows.filter(
            (p) => !!p.completed_at && p.completed_at >= isoToUtcStart(year_start) && p.completed_at < isoToUtcStart(next_start)
        ).length;
        const ytd_projects_active = yProjRows.filter((p) => {
            const createdBeforeRangeEnd = p.created_at < isoToUtcStart(next_start);
            const notCompletedBeforeYearStart = !p.completed_at || p.completed_at >= isoToUtcStart(year_start);
            return createdBeforeRangeEnd && notCompletedBeforeYearStart;
        }).length;

        const yLeadRows = (yLeads ?? []) as { created_at: string; closed_at: string | null }[];
        const ytd_leads_received = yLeadRows.filter(
            (l) => l.created_at >= isoToUtcStart(year_start) && l.created_at < isoToUtcStart(next_start)
        ).length;
        const ytd_leads_closed = yLeadRows.filter(
            (l) => !!l.closed_at && l.closed_at >= isoToUtcStart(year_start) && l.closed_at < isoToUtcStart(next_start)
        ).length;
        const ytd_leads_active = yLeadRows.filter((l) => {
            const createdBeforeRangeEnd = l.created_at < isoToUtcStart(next_start);
            const notClosedBeforeYearStart = !l.closed_at || l.closed_at >= isoToUtcStart(year_start);
            return createdBeforeRangeEnd && notClosedBeforeYearStart;
        }).length;

        const summary = {
            period_start,
            computed_at: new Date().toISOString(),
            invoices: {
                rule: "due_date month (excluding cancelled)",
                count: invoicesCount,
                total: invoicesTotal,
                paid_count: paidCount,
                paid_total: paidTotal,
                unpaid_count: unpaidCount,
                unpaid_total: unpaidTotal,
            },
            projects: {
                rule: "active during month (created before month end and not completed before month start)",
                opened: projectsOpened,
                active_during_month: projectsActive,
                completed: projectsCompleted,
            },
            leads: {
                rule: "active during month (created before month end and not closed before month start)",
                received: leadsReceived,
                active_during_month: leadsActive,
                new: leadsNew,
                contacted: leadsContacted,
                closed: leadsClosed,
            },
            ytd: {
                rule: `Jan 1 ${selectedYear} → end of month`,
                invoices: {
                    count: ytd_inv_count,
                    total: ytd_inv_total,
                    paid_count: ytd_paid_count,
                    paid_total: ytd_paid_total,
                    unpaid_count: ytd_unpaid_count,
                    unpaid_total: ytd_unpaid_total,
                },
                projects: {
                    opened: ytd_projects_opened,
                    active_during_period: ytd_projects_active,
                    completed: ytd_projects_completed,
                },
                leads: {
                    received: ytd_leads_received,
                    active_during_period: ytd_leads_active,
                    closed: ytd_leads_closed,
                },
            },
        };

        const up1 = await supabase
            .from("monthly_reports")
            .upsert(
                { period_start, summary, created_at: new Date().toISOString() },
                { onConflict: "owner_id,period_start" }
            );

        if (up1.error) return { ok: false, message: up1.error.message };

        const up2 = await supabase
            .from("reporting_periods")
            .upsert(
                {
                    period_start,
                    status: "closed",
                    generated_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                },
                { onConflict: "owner_id,period_start" }
            );

        if (up2.error) return { ok: false, message: up2.error.message };

        await supabase
            .from("reporting_periods")
            .upsert(
                { period_start: next_start, status: "open", updated_at: new Date().toISOString() },
                { onConflict: "owner_id,period_start" }
            );

        revalidatePath("/admin/reports");
        revalidatePath(`/admin/reports?month=${toMonthParam(period_start)}`);
        return { ok: true as const };
    }

    const trendMonths = [
        addMonthsStartISO(selectedStart, -5),
        addMonthsStartISO(selectedStart, -4),
        addMonthsStartISO(selectedStart, -3),
        addMonthsStartISO(selectedStart, -2),
        addMonthsStartISO(selectedStart, -1),
        selectedStart,
    ];

    const trendData = await Promise.all(trendMonths.map((m) => buildTrendRow(supabase, m)));
    const monthLabel = monthLabelFromStartISO(selectedStart);

    const prevHref = `/admin/reports?month=${toMonthParam(prevMonthStart)}`;
    const currentHref = `/admin/reports?month=${toMonthParam(currentMonthStart)}`;
    const nextHref = `/admin/reports?month=${toMonthParam(nextMonthStart)}`;

    return (
        <div className="space-y-6">
            <div className="relative overflow-hidden rounded-[28px] border border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(122,60,255,0.20),transparent_26%),radial-gradient(circle_at_top_right,rgba(0,229,255,0.14),transparent_28%),linear-gradient(180deg,#090914_0%,#0d0d18_100%)] p-6 text-white shadow-2xl shadow-fuchsia-950/20">
                <div className="absolute inset-0 opacity-25">
                    <div className="absolute left-[8%] top-[16%] h-56 w-56 rounded-full border border-white/10" />
                    <div className="absolute right-[10%] top-[20%] h-72 w-72 rounded-full border border-white/10" />
                    <div className="absolute bottom-[14%] left-[22%] h-40 w-40 rounded-full border border-white/10" />
                </div>

                <div className="relative flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                        <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs text-white/80 backdrop-blur">
                            <FileBarChart className="h-3.5 w-3.5 text-cyan-300" />
                            Monthly reporting
                        </div>

                        <h1 className="text-2xl font-semibold tracking-tight">Reports</h1>
                        <p className="mt-2 text-sm text-white/70">
                            Monthly summary for invoices, projects, and leads.
                        </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                        <Button asChild variant="outline" className="border-white/15 bg-white/5 text-white hover:bg-white/10 hover:text-white">
                            <Link href="/admin" className="flex items-center gap-2">
                                <Sparkles className="h-4 w-4" />
                                Back to Dashboard
                            </Link>
                        </Button>
                    </div>
                </div>
            </div>

            <Card className="border-white/10 shadow-sm">
                <CardHeader className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                        <CardTitle className="flex items-center gap-2">
                            <CalendarRange className="h-5 w-5 text-fuchsia-500" />
                            {monthLabel}
                        </CardTitle>
                        <CardDescription className="mt-2 flex flex-wrap items-center gap-2">
                            <span>Period status:</span>
                            <Badge
                                variant="outline"
                                className={
                                    isClosed
                                        ? "border-fuchsia-200 bg-fuchsia-50 text-fuchsia-700"
                                        : "border-cyan-200 bg-cyan-50 text-cyan-700"
                                }
                            >
                                {isClosed ? "closed" : "open"}
                            </Badge>
                            {periodRow?.generated_at ? (
                                <span className="text-xs text-muted-foreground">
                                    Generated: {new Date(periodRow.generated_at).toLocaleString("en-ZA")}
                                </span>
                            ) : null}
                        </CardDescription>
                    </div>

                    <ReportsMonthNav
                        prevHref={prevHref}
                        currentHref={currentHref}
                        nextHref={nextHref}
                    />
                </CardHeader>

                <CardContent className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="text-sm text-muted-foreground">
                        Invoices use <span className="font-medium text-foreground">due date month</span>. Projects and leads use{" "}
                        <span className="font-medium text-foreground">active during month</span>.
                    </div>

                    <div className="flex flex-wrap gap-2">
                        <Button asChild variant="outline">
                            <a href={`/api/reports/pdf?month=${toMonthParam(selectedStart)}`} target="_blank" rel="noreferrer" className="flex items-center gap-2">
                                <Download className="h-4 w-4" />
                                Download PDF
                            </a>
                        </Button>

                        <Button asChild variant="outline">
                            <a href={`/api/reports/pdf?month=${toMonthParam(selectedStart)}&mode=ytd`} target="_blank" rel="noreferrer" className="flex items-center gap-2">
                                <Download className="h-4 w-4" />
                                Download YTD PDF
                            </a>
                        </Button>

                        <form
    action={async (formData: FormData) => {
        "use server";
        await generateReportAction(formData);
    }}
>
    <input type="hidden" name="period_start" value={selectedStart} />
    <ReportsGenerateButton isClosed={isClosed} />
</form>
                    </div>
                </CardContent>
            </Card>

            {(invErr || projErr || leadErr) ? (
                <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
                    {invErr ? <div>Invoices error: {invErr.message}</div> : null}
                    {projErr ? <div>Projects error: {projErr.message}</div> : null}
                    {leadErr ? <div>Leads error: {leadErr.message}</div> : null}
                </div>
            ) : null}

            <div className="grid gap-4 md:grid-cols-3">
                <Card className="border-white/10 shadow-sm">
                    <CardHeader className="pb-2">
                        <CardTitle className="flex items-center gap-2 text-sm font-medium">
                            <Receipt className="h-4 w-4 text-fuchsia-500" />
                            Invoices (month)
                        </CardTitle>
                        <CardDescription>Due date inside this month (excl. cancelled)</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        <div className="text-3xl font-semibold">{invoicesCount}</div>
                        <div className="text-sm text-muted-foreground">
                            Total: <span className="font-medium text-foreground">R {money(invoicesTotal)}</span>
                        </div>
                        <div className="text-sm text-muted-foreground">
                            Paid: <span className="font-medium text-foreground">{paidCount}</span> • <span className="font-medium text-foreground">R {money(paidTotal)}</span>
                        </div>
                        <div className="text-sm text-muted-foreground">
                            Unpaid: <span className="font-medium text-foreground">{unpaidCount}</span> • <span className="font-medium text-foreground">R {money(unpaidTotal)}</span>
                        </div>
                        <div className="pt-2">
                            <Button asChild variant="outline" className="w-full">
                                <Link href="/admin/invoices">Open invoices</Link>
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-white/10 shadow-sm">
                    <CardHeader className="pb-2">
                        <CardTitle className="flex items-center gap-2 text-sm font-medium">
                            <FolderKanban className="h-4 w-4 text-cyan-500" />
                            Projects (month)
                        </CardTitle>
                        <CardDescription>Carry-over aware</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        <div className="text-sm text-muted-foreground">
                            Opened: <span className="font-medium text-foreground">{projectsOpened}</span>
                        </div>
                        <div className="text-sm text-muted-foreground">
                            Active during month: <span className="font-medium text-foreground">{projectsActiveDuringMonth}</span>
                        </div>
                        <div className="text-sm text-muted-foreground">
                            Completed: <span className="font-medium text-foreground">{projectsCompleted}</span>
                        </div>
                        <div className="pt-2">
                            <Button asChild variant="outline" className="w-full">
                                <Link href="/admin/projects">Open projects</Link>
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-white/10 shadow-sm">
                    <CardHeader className="pb-2">
                        <CardTitle className="flex items-center gap-2 text-sm font-medium">
                            <Users className="h-4 w-4 text-purple-500" />
                            Leads (month)
                        </CardTitle>
                        <CardDescription>Carry-over aware</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        <div className="text-sm text-muted-foreground">
                            Received: <span className="font-medium text-foreground">{leadsReceived}</span>
                        </div>
                        <div className="text-sm text-muted-foreground">
                            Active during month: <span className="font-medium text-foreground">{leadsActiveDuringMonth}</span>
                        </div>
                        <div className="text-sm text-muted-foreground">
                            Closed: <span className="font-medium text-foreground">{leadsClosed}</span>
                        </div>
                        <div className="text-sm text-muted-foreground">
                            New: <span className="font-medium text-foreground">{leadsNew}</span> • Contacted: <span className="font-medium text-foreground">{leadsContacted}</span>
                        </div>
                        <div className="pt-2">
                            <Button asChild variant="outline" className="w-full">
                                <Link href="/admin/leads">Open leads</Link>
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Card className="border-white/10 shadow-sm">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <TrendingUp className="h-5 w-5 text-fuchsia-500" />
                        6-Month Trend Summary
                    </CardTitle>
                    <CardDescription>Pattern view for the last 6 months up to the selected month.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="overflow-x-auto rounded-lg border">
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

                    <ReportsTrendCharts data={trendData} />
                </CardContent>
            </Card>

            <Card className="border-white/10 shadow-sm">
                <CardHeader>
                    <CardTitle>Year-to-date (YTD)</CardTitle>
                    <CardDescription>
                        Jan 1 {selectedYear} → end of {monthLabel}. Invoices use due date month.
                    </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-3">
                    <div className="rounded-xl border bg-white p-4">
                        <div className="text-sm font-semibold">Invoices YTD</div>
                        <div className="mt-2 text-2xl font-semibold">{ytdInvCount}</div>
                        <div className="mt-2 text-sm text-muted-foreground">
                            Total: <span className="font-medium text-foreground">R {money(ytdInvTotal)}</span>
                        </div>
                        <div className="text-sm text-muted-foreground">
                            Paid: <span className="font-medium text-foreground">{ytdPaidCount}</span> • <span className="font-medium text-foreground">R {money(ytdPaidTotal)}</span>
                        </div>
                        <div className="text-sm text-muted-foreground">
                            Unpaid: <span className="font-medium text-foreground">{ytdUnpaidCount}</span> • <span className="font-medium text-foreground">R {money(ytdUnpaidTotal)}</span>
                        </div>
                    </div>

                    <div className="rounded-xl border bg-white p-4">
                        <div className="text-sm font-semibold">Projects YTD</div>
                        <div className="mt-2 text-sm text-muted-foreground">
                            Opened: <span className="font-medium text-foreground">{ytdProjectsOpened}</span>
                        </div>
                        <div className="text-sm text-muted-foreground">
                            Active during period: <span className="font-medium text-foreground">{ytdProjectsActive}</span>
                        </div>
                        <div className="text-sm text-muted-foreground">
                            Completed: <span className="font-medium text-foreground">{ytdProjectsCompleted}</span>
                        </div>
                    </div>

                    <div className="rounded-xl border bg-white p-4">
                        <div className="text-sm font-semibold">Leads YTD</div>
                        <div className="mt-2 text-sm text-muted-foreground">
                            Received: <span className="font-medium text-foreground">{ytdLeadsReceived}</span>
                        </div>
                        <div className="text-sm text-muted-foreground">
                            Active during period: <span className="font-medium text-foreground">{ytdLeadsActive}</span>
                        </div>
                        <div className="text-sm text-muted-foreground">
                            Closed: <span className="font-medium text-foreground">{ytdLeadsClosed}</span>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card className="border-white/10 shadow-sm">
                <CardHeader>
                    <CardTitle>Saved snapshot</CardTitle>
                    <CardDescription>This is what gets frozen when you generate the report.</CardDescription>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                    {snapshotRow ? (
                        <div className="space-y-2">
                            <div>
                                Snapshot created:{" "}
                                <span className="font-medium text-foreground">
                                    {new Date(snapshotRow.created_at).toLocaleString("en-ZA")}
                                </span>
                            </div>
                            <pre className="max-h-[320px] overflow-auto rounded-lg border bg-muted/20 p-3 text-xs">
                                {JSON.stringify(snapshotRow.summary, null, 2)}
                            </pre>
                        </div>
                    ) : (
                        <div className="rounded-md border p-4">
                            No snapshot saved yet. Click <span className="font-medium text-foreground">Generate monthly report</span>.
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}