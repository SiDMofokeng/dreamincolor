import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AddProjectDialog from "@/components/admin/add-project-dialog";
import ProjectsFilters from "@/components/admin/projects-filters";
import ProjectsMonthNav from "@/components/admin/projects-month-nav";
import ProjectsArchiveMonthsNav from "@/components/admin/projects-archive-months-nav";
import DeleteProjectButton from "@/components/admin/delete-project-button";
import ProjectEditDialog from "@/components/admin/project-edit-dialog";
import ProjectStatusSelect from "@/components/admin/project-status-select";
import ProjectPrioritySelect from "@/components/admin/project-priority-select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
    Briefcase,
    CalendarDays,
    CheckCircle2,
    Download,
    FolderKanban,
    Pencil,
    PlayCircle,
    Sparkles,
    Trash2,
} from "lucide-react";

type ClientOption = { id: string; name: string };

type ProjectRow = {
    id: string;
    client_id: string;
    client_name: string;
    title: string;
    status: string;
    priority: string;
    due_date: string | null;
    created_at: string;
    completed_at: string | null;
};

type ProjectEditRow = {
    id: string;
    client_id: string;
    title: string;
    description: string | null;
    status: string;
    priority: string;
    start_date: string | null;
    due_date: string | null;
    internal_notes: string | null;
    completed_at: string | null;
    created_at: string;
};

type ReportingPeriodRow = {
    period_start: string;
    status: string;
};

type PageProps = {
    searchParams?: Promise<{ client?: string; q?: string; status?: string; month?: string; edit?: string }>;
};

function fmtDate(d: string | null) {
    if (!d) return "—";
    return new Date(d).toLocaleDateString("en-ZA", {
        year: "numeric",
        month: "short",
        day: "2-digit",
    });
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

function isoToUtcStart(d: string) {
    return `${d}T00:00:00.000Z`;
}

function normalizeStatus(status: string | null | undefined) {
    return String(status ?? "").trim().toLowerCase();
}

function normalizePriority(priority: string | null | undefined) {
    return String(priority ?? "").trim().toLowerCase();
}

function buildProjectsUrl(params: {
    month: string;
    q?: string;
    status?: string;
    client?: string;
    edit?: string;
}) {
    const qp = new URLSearchParams();
    qp.set("month", params.month);
    if (params.q) qp.set("q", params.q);
    if (params.status && params.status !== "all") qp.set("status", params.status);
    if (params.client) qp.set("client", params.client);
    if (params.edit) qp.set("edit", params.edit);
    return `/admin/projects?${qp.toString()}`;
}

export default async function ProjectsPage({ searchParams }: PageProps) {
    const sp = (await searchParams) ?? {};
    const defaultClientId = sp.client ? String(sp.client) : undefined;
    const q = (sp.q ? String(sp.q) : "").trim();
    const statusFilter = (sp.status ? String(sp.status) : "").trim();
    const editId = (sp.edit ? String(sp.edit) : "").trim();

    const now = new Date();
    const currentMonthStart = `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-01`;
    const selectedMonthStart = monthStartISOFromParam(sp.month) ?? currentMonthStart;
    const nextMonthStart = addMonthsStartISO(selectedMonthStart, 1);
    const prevMonthStart = addMonthsStartISO(selectedMonthStart, -1);

    const supabase = await createClient();
    const { data: userRes } = await supabase.auth.getUser();
    if (!userRes?.user) redirect("/login");

    async function createProjectAction(formData: FormData) {
        "use server";

        const supabase = await createClient();

        const client_id = String(formData.get("client_id") ?? "").trim();
        const title = String(formData.get("title") ?? "").trim();
        const description = String(formData.get("description") ?? "").trim() || null;
        const status = String(formData.get("status") ?? "in-progress").trim();
        const priority = String(formData.get("priority") ?? "medium").trim();
        const start_date = String(formData.get("start_date") ?? "").trim() || null;
        const due_date = String(formData.get("due_date") ?? "").trim() || null;
        const internal_notes = String(formData.get("internal_notes") ?? "").trim() || null;

        if (!client_id) return { ok: false, message: "Client is required." };
        if (!title) return { ok: false, message: "Project title is required." };

        const { error } = await supabase.from("projects").insert({
            client_id,
            title,
            description,
            status,
            priority,
            start_date,
            due_date,
            internal_notes,
        });

        if (error) return { ok: false, message: error.message };

        revalidatePath("/admin/projects");
        revalidatePath("/admin");
        revalidatePath("/admin/reports");
        return { ok: true as const };
    }

    async function updateProjectAction(projectId: string, formData: FormData) {
        "use server";

        const supabase = await createClient();

        const title = String(formData.get("title") ?? "").trim();
        const description = String(formData.get("description") ?? "").trim() || null;
        const status = String(formData.get("status") ?? "in-progress").trim();
        const priority = String(formData.get("priority") ?? "medium").trim();
        const start_date = String(formData.get("start_date") ?? "").trim() || null;
        const due_date = String(formData.get("due_date") ?? "").trim() || null;
        const internal_notes = String(formData.get("internal_notes") ?? "").trim() || null;

        if (!title) return { ok: false, message: "Project title is required." };

        const normalizedStatus = normalizeStatus(status);
        const completed_at = normalizedStatus === "done" ? new Date().toISOString() : null;

        const { error } = await supabase
            .from("projects")
            .update({
                title,
                description,
                status,
                priority,
                start_date,
                due_date,
                internal_notes,
                completed_at,
                updated_at: new Date().toISOString(),
            })
            .eq("id", projectId);

        if (error) return { ok: false, message: error.message };

        revalidatePath("/admin/projects");
        revalidatePath("/admin/reports");
        revalidatePath("/admin");
        revalidatePath(`/admin/projects/${projectId}/edit`);

        return { ok: true as const };
    }

    async function updateProjectStatusAction(formData: FormData) {
        "use server";

        const supabase = await createClient();

        const projectId = String(formData.get("project_id") ?? "").trim();
        const status = String(formData.get("status") ?? "").trim().toLowerCase();

        if (!projectId) return { ok: false, message: "Project ID is required." };

        const allowed = ["lead", "onboarding", "in-progress", "review", "blocked", "done"];
        if (!allowed.includes(status)) {
            return { ok: false, message: "Invalid status." };
        }

        const completed_at = status === "done" ? new Date().toISOString() : null;

        const { error } = await supabase
            .from("projects")
            .update({
                status,
                completed_at,
                updated_at: new Date().toISOString(),
            })
            .eq("id", projectId);

        if (error) return { ok: false, message: error.message };

        revalidatePath("/admin/projects");
        revalidatePath("/admin");
        revalidatePath("/admin/reports");
        revalidatePath(`/admin/projects/${projectId}/edit`);

        return { ok: true as const, message: "Project status updated." };
    }

    async function updateProjectPriorityAction(formData: FormData) {
        "use server";

        const supabase = await createClient();

        const projectId = String(formData.get("project_id") ?? "").trim();
        const priority = normalizePriority(String(formData.get("priority") ?? ""));

        if (!projectId) return { ok: false, message: "Project ID is required." };

        const allowed = ["low", "medium", "high"];
        if (!allowed.includes(priority)) {
            return { ok: false, message: "Invalid priority." };
        }

        const { error } = await supabase
            .from("projects")
            .update({
                priority,
                updated_at: new Date().toISOString(),
            })
            .eq("id", projectId);

        if (error) return { ok: false, message: error.message };

        revalidatePath("/admin/projects");
        revalidatePath("/admin");
        revalidatePath("/admin/reports");
        revalidatePath(`/admin/projects/${projectId}/edit`);

        return { ok: true as const, message: "Project priority updated." };
    }

    async function deleteProjectAction(projectId: string) {
        "use server";

        const supabase = await createClient();

        const { error } = await supabase.from("projects").delete().eq("id", projectId);
        if (error) return { ok: false, message: error.message };

        revalidatePath("/admin/projects");
        revalidatePath("/admin");
        revalidatePath("/admin/reports");
        return { ok: true as const };
    }

    const { data: clientsData, error: clientsError } = await supabase
        .from("clients")
        .select("id,name")
        .order("created_at", { ascending: false });

    const clients = (clientsData ?? []) as ClientOption[];

    let query = supabase
        .from("projects_search")
        .select("id,client_id,client_name,title,status,priority,due_date,created_at")
        .order("created_at", { ascending: false });

    if (defaultClientId) query = query.eq("client_id", defaultClientId);
    if (statusFilter && statusFilter !== "all") query = query.eq("status", statusFilter);

    if (q) {
        const like = `%${q}%`;
        query = query.or(`title.ilike.${like},client_name.ilike.${like}`);
    }

    const { data: projectsData, error: projectsError } = await query;
    const baseProjects = (projectsData ?? []) as Omit<ProjectRow, "completed_at">[];

    const projectIds = baseProjects.map((p) => p.id);

    let completedMap = new Map<string, string | null>();
    if (projectIds.length > 0) {
        const { data: completionRows } = await supabase
            .from("projects")
            .select("id,completed_at")
            .in("id", projectIds);

        completedMap = new Map(
            (completionRows ?? []).map((r: any) => [String(r.id), (r.completed_at ?? null) as string | null])
        );
    }

    const projects: ProjectRow[] = baseProjects.map((p) => ({
        ...p,
        completed_at: completedMap.get(p.id) ?? null,
    }));

    const monthStartUtc = isoToUtcStart(selectedMonthStart);
    const monthEndUtc = isoToUtcStart(nextMonthStart);

    const monthProjects = projects.filter((p) => {
        const createdBeforeMonthEnd = p.created_at < monthEndUtc;
        const notCompletedBeforeMonthStart = !p.completed_at || p.completed_at >= monthStartUtc;
        return createdBeforeMonthEnd && notCompletedBeforeMonthStart;
    });

    const openedThisMonth = monthProjects.filter(
        (p) => p.created_at >= monthStartUtc && p.created_at < monthEndUtc
    ).length;

    const completedThisMonth = monthProjects.filter(
        (p) => !!p.completed_at && p.completed_at >= monthStartUtc && p.completed_at < monthEndUtc
    ).length;

    const activeDuringMonth = monthProjects.length;

    const { data: periodsData } = await supabase
        .from("reporting_periods")
        .select("period_start,status")
        .eq("status", "closed")
        .order("period_start", { ascending: false })
        .limit(12);

    const closedMonths = (periodsData ?? []) as ReportingPeriodRow[];
    const selectedMonthIsClosed = closedMonths.some((m) => m.period_start === selectedMonthStart);
    const isCurrentMonth = selectedMonthStart === currentMonthStart;

    const prevHref = buildProjectsUrl({
        month: toMonthParam(prevMonthStart),
        q,
        status: statusFilter,
        client: defaultClientId,
    });

    const currentHref = buildProjectsUrl({
        month: toMonthParam(currentMonthStart),
        q,
        status: statusFilter,
        client: defaultClientId,
    });

    const nextHref = buildProjectsUrl({
        month: toMonthParam(nextMonthStart),
        q,
        status: statusFilter,
        client: defaultClientId,
    });

    const archiveMonths = closedMonths.map((m) => ({
        href: buildProjectsUrl({
            month: toMonthParam(m.period_start),
            q,
            status: statusFilter,
            client: defaultClientId,
        }),
        label: monthLabelFromStartISO(m.period_start),
        active: m.period_start === selectedMonthStart,
    }));

    let selectedProject: ProjectEditRow | null = null;

    if (editId) {
        const { data: editProject } = await supabase
            .from("projects")
            .select("id,client_id,title,description,status,priority,start_date,due_date,internal_notes,completed_at,created_at")
            .eq("id", editId)
            .maybeSingle();

        selectedProject = (editProject ?? null) as ProjectEditRow | null;
    }

    const baseListUrl = buildProjectsUrl({
        month: toMonthParam(selectedMonthStart),
        q,
        status: statusFilter,
        client: defaultClientId,
    });

    const downloadPdfHref = `/api/projects/pdf?month=${encodeURIComponent(
        toMonthParam(selectedMonthStart)
    )}${q ? `&q=${encodeURIComponent(q)}` : ""}${statusFilter && statusFilter !== "all" ? `&status=${encodeURIComponent(statusFilter)}` : ""}${defaultClientId ? `&client=${encodeURIComponent(defaultClientId)}` : ""}`;

    return (
        <div className="space-y-6">
            {selectedProject ? (
                <ProjectEditDialog
                    open={true}
                    closeHref={baseListUrl}
                    project={selectedProject}
                    onSave={async (formData) => {
                        "use server";
                        return updateProjectAction(editId, formData);
                    }}
                />
            ) : null}

            <div className="rounded-3xl border border-white/10 bg-white/[0.06] p-6 text-white shadow-2xl backdrop-blur-xl">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                        <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-cyan-500/90 to-blue-600/90 px-3 py-1 text-xs font-medium text-white shadow-lg shadow-cyan-500/20">
                            <FolderKanban className="h-3.5 w-3.5" />
                            Project manager
                        </div>
                        <h1 className="text-2xl font-semibold tracking-tight">Projects</h1>
                        <p className="mt-1 text-sm text-white/65">
                            Current work + monthly archive view.{defaultClientId ? " (Client filtered)" : ""}
                        </p>
                    </div>

                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
                        <ProjectsFilters initialQ={q} initialStatus={statusFilter || "all"} />
                        <AddProjectDialog
                            clients={clients}
                            defaultClientId={defaultClientId}
                            onCreate={createProjectAction}
                        />
                    </div>
                </div>
            </div>

            <Card className="border-0 bg-white shadow-xl">
                <CardHeader className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                        <CardTitle className="flex items-center gap-2">
                            <CalendarDays className="h-5 w-5 text-cyan-600" />
                            {monthLabelFromStartISO(selectedMonthStart)}
                        </CardTitle>
                        <CardDescription>
                            {isCurrentMonth ? "Current month view" : "Archive month view"} •{" "}
                            {selectedMonthIsClosed ? "Closed / archived" : "Open / live"}
                        </CardDescription>
                    </div>

                    <ProjectsMonthNav
                        prevHref={prevHref}
                        currentHref={currentHref}
                        nextHref={nextHref}
                    />
                </CardHeader>

                <CardContent className="space-y-4">
                    <ProjectsArchiveMonthsNav months={archiveMonths} />

                    <div className="grid gap-4 md:grid-cols-3">
                        <Card className="border shadow-sm">
                            <CardHeader className="pb-2">
                                <CardTitle className="flex items-center gap-2 text-sm font-medium">
                                    <PlayCircle className="h-4 w-4 text-cyan-600" />
                                    Opened
                                </CardTitle>
                                <CardDescription>Created in this month</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="text-3xl font-semibold">{openedThisMonth}</div>
                            </CardContent>
                        </Card>

                        <Card className="border shadow-sm">
                            <CardHeader className="pb-2">
                                <CardTitle className="flex items-center gap-2 text-sm font-medium">
                                    <Briefcase className="h-4 w-4 text-violet-600" />
                                    Active During Month
                                </CardTitle>
                                <CardDescription>Carry-over aware</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="text-3xl font-semibold">{activeDuringMonth}</div>
                            </CardContent>
                        </Card>

                        <Card className="border shadow-sm">
                            <CardHeader className="pb-2">
                                <CardTitle className="flex items-center gap-2 text-sm font-medium">
                                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                                    Completed
                                </CardTitle>
                                <CardDescription>Marked done in this month</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="text-3xl font-semibold">{completedThisMonth}</div>
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

            <Card className="border-0 bg-white shadow-xl">
                <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                        <CardTitle>Project List</CardTitle>
                        <CardDescription>
                            {q || (statusFilter && statusFilter !== "all") ? (
                                <>
                                    Showing {monthProjects.length} result{monthProjects.length === 1 ? "" : "s"} for{" "}
                                    <span className="font-medium">{monthLabelFromStartISO(selectedMonthStart)}</span>
                                    {q ? (
                                        <>
                                            {" "}
                                            • search: <span className="font-medium">“{q}”</span>
                                        </>
                                    ) : null}
                                    {statusFilter && statusFilter !== "all" ? (
                                        <>
                                            {" "}
                                            • status: <span className="font-medium">{statusFilter}</span>
                                        </>
                                    ) : null}
                                </>
                            ) : (
                                <>
                                    {monthProjects.length} project{monthProjects.length === 1 ? "" : "s"} for{" "}
                                    <span className="font-medium">{monthLabelFromStartISO(selectedMonthStart)}</span>
                                </>
                            )}
                        </CardDescription>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        <Button asChild variant="outline" className="cursor-pointer transition hover:bg-slate-100">
                            <a href={downloadPdfHref} target="_blank" rel="noreferrer" className="flex items-center gap-2">
                                <Download className="h-4 w-4" />
                                Download PDF
                            </a>
                        </Button>

                        {projectsError ? (
                            <Badge variant="destructive" className="w-fit">
                                DB Error
                            </Badge>
                        ) : (
                            <Badge className="w-fit border-0 bg-gradient-to-r from-emerald-500 to-teal-600 text-white">
                                <Sparkles className="mr-1 h-3.5 w-3.5" />
                                {selectedMonthIsClosed ? "Archived View" : "Live View"}
                            </Badge>
                        )}
                    </div>
                </CardHeader>

                <CardContent>
                    {projectsError ? (
                        <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
                            {projectsError.message}
                        </div>
                    ) : monthProjects.length === 0 ? (
                        <div className="rounded-lg border bg-background p-6">
                            <div className="text-sm font-medium">No projects for this month</div>
                            <div className="mt-1 text-sm text-muted-foreground">
                                Try a different month or clear filters.
                            </div>
                        </div>
                    ) : (
                        <div className="overflow-hidden rounded-xl border">
                            <Table>
                                <TableHeader className="bg-slate-200/90">
                                    <TableRow className="border-b border-slate-300 hover:bg-slate-200/90">
                                        <TableHead className="font-semibold text-slate-800">Project</TableHead>
                                        <TableHead className="font-semibold text-slate-800">Client</TableHead>
                                        <TableHead className="font-semibold text-slate-800">Status</TableHead>
                                        <TableHead className="font-semibold text-slate-800">Priority</TableHead>
                                        <TableHead className="font-semibold text-slate-800">Due</TableHead>
                                        <TableHead className="text-right font-semibold text-slate-800">Created</TableHead>
                                        <TableHead className="text-right font-semibold text-slate-800">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>

                                <TableBody>
                                    {monthProjects.map((p, index) => (
                                        <TableRow
                                            key={p.id}
                                            className={index % 2 === 0 ? "bg-white" : "bg-slate-50/60"}
                                        >
                                            <TableCell className="font-medium">
                                                <Link
                                                    href={buildProjectsUrl({
                                                        month: toMonthParam(selectedMonthStart),
                                                        q,
                                                        status: statusFilter,
                                                        client: defaultClientId,
                                                        edit: p.id,
                                                    })}
                                                    className="cursor-pointer underline-offset-4 transition hover:text-cyan-700 hover:underline"
                                                >
                                                    {p.title}
                                                </Link>
                                            </TableCell>

                                            <TableCell className="text-muted-foreground">{p.client_name ?? "—"}</TableCell>

                                            <TableCell>
                                                <ProjectStatusSelect
                                                    projectId={p.id}
                                                    currentStatus={p.status}
                                                    onUpdate={updateProjectStatusAction}
                                                />
                                            </TableCell>

                                            <TableCell>
                                                <ProjectPrioritySelect
                                                    projectId={p.id}
                                                    currentPriority={p.priority}
                                                    onUpdate={updateProjectPriorityAction}
                                                />
                                            </TableCell>

                                            <TableCell className="text-muted-foreground">{fmtDate(p.due_date)}</TableCell>

                                            <TableCell className="text-right text-muted-foreground">
                                                {fmtDate(p.created_at)}
                                            </TableCell>

                                            <TableCell className="text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <Button
                                                        asChild
                                                        variant="outline"
                                                        size="icon"
                                                        className="cursor-pointer border-cyan-200 text-cyan-700 transition hover:border-cyan-300 hover:bg-cyan-50 hover:text-cyan-800"
                                                    >
                                                        <Link
                                                            href={buildProjectsUrl({
                                                                month: toMonthParam(selectedMonthStart),
                                                                q,
                                                                status: statusFilter,
                                                                client: defaultClientId,
                                                                edit: p.id,
                                                            })}
                                                            aria-label={`Edit ${p.title}`}
                                                        >
                                                            <Pencil className="h-4 w-4" />
                                                        </Link>
                                                    </Button>

                                                    <DeleteProjectButton
                                                        projectTitle={p.title}
                                                        onDelete={async () => {
                                                            "use server";
                                                            return deleteProjectAction(p.id);
                                                        }}
                                                        trigger={
                                                            <Button
                                                                type="button"
                                                                variant="outline"
                                                                size="icon"
                                                                aria-label={`Delete ${p.title}`}
                                                                className="cursor-pointer border-red-200 text-red-600 transition hover:border-red-300 hover:bg-red-50 hover:text-red-700"
                                                            >
                                                                <Trash2 className="h-4 w-4" />
                                                            </Button>
                                                        }
                                                    />
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