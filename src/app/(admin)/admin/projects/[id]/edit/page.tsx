import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import DeleteProjectButton from "@/components/admin/delete-project-button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, CalendarDays, Pencil, Save } from "lucide-react";

type PageProps = {
    params: Promise<{ id: string }>;
};

export default async function EditProjectPage({ params }: PageProps) {
    const { id } = await params;

    const supabase = await createClient();
    const { data: userRes } = await supabase.auth.getUser();
    if (!userRes?.user) redirect("/login");

    const { data: project, error } = await supabase
        .from("projects")
        .select("id,client_id,title,description,status,priority,start_date,due_date,internal_notes,completed_at,created_at")
        .eq("id", id)
        .maybeSingle();

    if (error) {
        return (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
                {error.message}
            </div>
        );
    }

    if (!project) notFound();

    async function updateProjectAction(formData: FormData) {
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

        const normalizedStatus = status.toLowerCase().trim();
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
            .eq("id", id);

        if (error) return { ok: false, message: error.message };

        revalidatePath("/admin/projects");
        revalidatePath("/admin/reports");
        revalidatePath("/admin");
        revalidatePath(`/admin/projects/${id}/edit`);

        return { ok: true as const };
    }

    async function deleteProjectAction() {
        "use server";

        const supabase = await createClient();

        const { error } = await supabase.from("projects").delete().eq("id", id);
        if (error) return { ok: false, message: error.message };

        revalidatePath("/admin/projects");
        revalidatePath("/admin");
        revalidatePath("/admin/reports");
        redirect("/admin/projects");
    }

    return (
        <div className="space-y-6">
            <div className="rounded-3xl border border-white/10 bg-white/[0.06] p-6 text-white shadow-2xl backdrop-blur-xl">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div className="min-w-0">
                        <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-cyan-500/90 to-blue-600/90 px-3 py-1 text-xs font-medium text-white shadow-lg shadow-cyan-500/20">
                            <Pencil className="h-3.5 w-3.5" />
                            Edit project
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                            <h1 className="truncate text-2xl font-semibold tracking-tight">Edit Project</h1>
                            <Badge variant="secondary">{project.status}</Badge>
                            <Badge variant="outline">{project.priority}</Badge>
                        </div>

                        <p className="mt-1 text-sm text-white/65">{project.title}</p>
                    </div>

                    <div className="flex gap-2">
                        <Button asChild variant="outline" className="border-white/15 bg-white/5 text-white hover:bg-white/10 hover:text-white">
                            <Link href="/admin/projects" className="flex items-center gap-2">
                                <ArrowLeft className="h-4 w-4" />
                                Back to Projects
                            </Link>
                        </Button>
                    </div>
                </div>
            </div>

            <Card className="border-0 bg-white shadow-xl">
                <CardHeader>
                    <CardTitle>Project Details</CardTitle>
                    <CardDescription>Update status, priority and dates</CardDescription>
                </CardHeader>

                <CardContent className="space-y-6">
                    <form
    action={async (formData: FormData) => {
        "use server";
        await updateProjectAction(formData);
    }}
    className="space-y-4"
>
                        <div className="space-y-2">
                            <Label htmlFor="title">Title</Label>
                            <Input id="title" name="title" defaultValue={project.title} required />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="description">Description</Label>
                            <Textarea id="description" name="description" defaultValue={project.description ?? ""} rows={4} />
                        </div>

                        <div className="grid gap-4 sm:grid-cols-2">
                            <div className="space-y-2">
                                <Label htmlFor="status">Status</Label>
                                <Input id="status" name="status" defaultValue={project.status ?? "in-progress"} />
                                <div className="text-xs text-muted-foreground">
                                    If status is set to <span className="font-medium">done</span>, completed_at is recorded automatically.
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="priority">Priority</Label>
                                <Input id="priority" name="priority" defaultValue={project.priority ?? "medium"} />
                            </div>
                        </div>

                        <div className="grid gap-4 sm:grid-cols-2">
                            <div className="space-y-2">
                                <Label htmlFor="start_date" className="flex items-center gap-2">
                                    <CalendarDays className="h-4 w-4 text-cyan-600" />
                                    Start Date
                                </Label>
                                <Input id="start_date" name="start_date" type="date" defaultValue={project.start_date ?? ""} />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="due_date" className="flex items-center gap-2">
                                    <CalendarDays className="h-4 w-4 text-fuchsia-600" />
                                    Due Date
                                </Label>
                                <Input id="due_date" name="due_date" type="date" defaultValue={project.due_date ?? ""} />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>Completed At</Label>
                            <Input
                                value={project.completed_at ? new Date(project.completed_at).toLocaleString("en-ZA") : ""}
                                readOnly
                                placeholder="Will populate when status becomes done"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="internal_notes">Internal Notes</Label>
                            <Textarea id="internal_notes" name="internal_notes" defaultValue={project.internal_notes ?? ""} rows={4} />
                        </div>

                        <div className="flex flex-wrap gap-2">
                            <Button
                                type="submit"
                                className="border-0 bg-gradient-to-r from-fuchsia-500 to-purple-600 text-white hover:from-fuchsia-500 hover:to-purple-600"
                            >
                                <Save className="mr-2 h-4 w-4" />
                                Save Changes
                            </Button>

                            <Button asChild type="button" variant="outline">
                                <Link href="/admin/projects">Cancel</Link>
                            </Button>
                        </div>
                    </form>

                    <div className="pt-2">
                        <div className="text-sm font-semibold">Danger zone</div>
                        <div className="mt-1 text-sm text-muted-foreground">
                            Deleting the project will unlink it from any invoices (invoice remains).
                        </div>
                        <div className="mt-3">
                            <DeleteProjectButton projectTitle={project.title} onDelete={deleteProjectAction} />
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}