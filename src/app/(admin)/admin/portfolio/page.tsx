// FILE: src/app/(admin)/admin/portfolio/page.tsx
import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
    ArrowLeft,
    Briefcase,
    Eye,
    ImageIcon,
    LayoutDashboard,
    Paintbrush,
    Plus,
    Sparkles,
} from "lucide-react";

type PortfolioRow = {
    id: string;
    title: string;
    item_type: string;
    category: string | null;
    description: string | null;
    image_url: string | null;
    project_url: string | null;
    sort_order: number;
    is_published: boolean;
    created_at: string;
};

function fmtDate(d: string) {
    try {
        return new Date(d).toLocaleDateString("en-ZA", {
            year: "numeric",
            month: "short",
            day: "2-digit",
        });
    } catch {
        return d;
    }
}

function prettyItemType(v: string | null | undefined) {
    const x = String(v ?? "").trim().toLowerCase();
    if (x === "artwork") return "Artwork";
    return "Project";
}

export default async function AdminPortfolioPage() {
    const supabase = await createClient();

    const { data: userRes } = await supabase.auth.getUser();
    if (!userRes?.user) redirect("/login");

    async function createPortfolioAction(formData: FormData) {
        "use server";

        const supabase = await createClient();

        const title = String(formData.get("title") ?? "").trim();
        const item_type_raw = String(formData.get("item_type") ?? "project").trim().toLowerCase();
        const item_type = item_type_raw === "artwork" ? "artwork" : "project";
        const category = String(formData.get("category") ?? "").trim() || null;
        const description = String(formData.get("description") ?? "").trim() || null;
        const image_url = String(formData.get("image_url") ?? "").trim() || null;
        const project_url = String(formData.get("project_url") ?? "").trim() || null;
        const sort_order = Number(formData.get("sort_order") ?? 0);
        const is_published = formData.get("is_published") === "on";

        if (!title) return { ok: false, message: "Title is required." };
        if (!Number.isFinite(sort_order)) return { ok: false, message: "Sort order must be a number." };

        const { data: inserted, error } = await supabase
            .from("portfolio_items")
            .insert({
                title,
                item_type,
                category,
                description,
                image_url,
                project_url,
                sort_order,
                is_published,
            })
            .select("id")
            .single();

        if (error) return { ok: false, message: error.message };

        revalidatePath("/admin/portfolio");
        revalidatePath("/");
        redirect(`/admin/portfolio/${inserted.id}/edit`);
    }

    async function togglePublishAction(id: string, next: boolean) {
        "use server";

        const supabase = await createClient();
        const { error } = await supabase
            .from("portfolio_items")
            .update({ is_published: next, updated_at: new Date().toISOString() })
            .eq("id", id);

        if (error) return { ok: false, message: error.message };

        revalidatePath("/admin/portfolio");
        revalidatePath("/");
        return { ok: true as const };
    }

    const { data, error } = await supabase
        .from("portfolio_items")
        .select("id,title,item_type,category,description,image_url,project_url,sort_order,is_published,created_at")
        .order("item_type", { ascending: true })
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: false });

    const items = (data ?? []) as PortfolioRow[];

    const projectItems = items.filter((x) => x.item_type !== "artwork");
    const artworkItems = items.filter((x) => x.item_type === "artwork");

    return (
        <div className="space-y-6">
            <div className="rounded-3xl border border-white/10 bg-white/[0.06] p-6 text-white shadow-2xl backdrop-blur-xl">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                        <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-fuchsia-500/90 to-purple-600/90 px-3 py-1 text-xs font-medium text-white shadow-lg shadow-fuchsia-500/20">
                            <Briefcase className="h-3.5 w-3.5" />
                            Portfolio manager
                        </div>

                        <h1 className="text-2xl font-semibold tracking-tight">Portfolio</h1>
                        <p className="mt-1 text-sm text-white/65">
                            Manage project items and artwork shown on the landing page.
                        </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                        <Button asChild variant="outline" className="border-white/15 bg-white/5 text-white hover:bg-white/10 hover:text-white">
                            <Link href="/" className="flex items-center gap-2">
                                <Eye className="h-4 w-4" />
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

            <Card className="border-0 bg-white shadow-xl">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Plus className="h-5 w-5 text-fuchsia-600" />
                        Add portfolio item
                    </CardTitle>
                    <CardDescription>
                        Projects appear in the work grid. Artwork items can hold carousel images on the public page.
                    </CardDescription>
                </CardHeader>

                <CardContent>
                    <form action={createPortfolioAction} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="title">Title</Label>
                            <Input id="title" name="title" placeholder="e.g. Brand identity + website" required />
                        </div>

                        <div className="grid gap-4 sm:grid-cols-3">
                            <div className="space-y-2">
                                <Label htmlFor="item_type">Item Type</Label>
                                <select
                                    id="item_type"
                                    name="item_type"
                                    defaultValue="project"
                                    className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                                >
                                    <option value="project">Project</option>
                                    <option value="artwork">Artwork</option>
                                </select>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="category">Category (optional)</Label>
                                <Input id="category" name="category" placeholder="e.g. Branding / Web / Print" />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="sort_order">Sort order</Label>
                                <Input id="sort_order" name="sort_order" type="number" defaultValue={0} />
                                <div className="text-xs text-muted-foreground">
                                    Lower numbers appear first.
                                </div>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="description">Description (optional)</Label>
                            <Textarea id="description" name="description" placeholder="Short summary..." rows={3} />
                        </div>

                        <div className="grid gap-4 sm:grid-cols-2">
                            <div className="space-y-2">
                                <Label htmlFor="project_url">Project URL (optional)</Label>
                                <Input id="project_url" name="project_url" placeholder="https://..." />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="image_url">Cover Image URL (optional)</Label>
                                <Input id="image_url" name="image_url" placeholder="https://..." />
                                <div className="text-xs text-muted-foreground">
                                    For artwork, this can act as a cover image. Extra artwork images are added on the edit page.
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <input id="is_published" name="is_published" type="checkbox" className="h-4 w-4" />
                            <Label htmlFor="is_published">Published</Label>
                        </div>

                        <div className="flex gap-2">
                            <Button
                                type="submit"
                                className="border-0 bg-gradient-to-r from-fuchsia-500 to-purple-600 text-white hover:from-fuchsia-500 hover:to-purple-600"
                            >
                                <Plus className="mr-2 h-4 w-4" />
                                Save item
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>

            <div className="grid gap-6 lg:grid-cols-2">
                <Card className="border-0 bg-white shadow-xl">
                    <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                        <div>
                            <CardTitle className="flex items-center gap-2">
                                <Briefcase className="h-5 w-5 text-cyan-600" />
                                Projects
                            </CardTitle>
                            <CardDescription>
                                {projectItems.length} item{projectItems.length === 1 ? "" : "s"}
                            </CardDescription>
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
                        ) : projectItems.length === 0 ? (
                            <div className="rounded-lg border bg-background p-6">
                                <div className="text-sm font-medium">No project items yet</div>
                                <div className="mt-1 text-sm text-muted-foreground">
                                    Add your first project item above.
                                </div>
                            </div>
                        ) : (
                            <div className="rounded-lg border">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Title</TableHead>
                                            <TableHead>Category</TableHead>
                                            <TableHead>Sort</TableHead>
                                            <TableHead>Published</TableHead>
                                            <TableHead className="text-right">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>

                                    <TableBody>
                                        {projectItems.map((it) => (
                                            <TableRow key={it.id}>
                                                <TableCell className="font-medium">
                                                    <Link
                                                        href={`/admin/portfolio/${it.id}/edit`}
                                                        className="underline-offset-4 hover:underline"
                                                    >
                                                        {it.title}
                                                    </Link>
                                                </TableCell>

                                                <TableCell className="text-muted-foreground">{it.category ?? "—"}</TableCell>
                                                <TableCell className="text-muted-foreground">{it.sort_order}</TableCell>

                                                <TableCell>
                                                    <Badge
                                                        className={
                                                            it.is_published
                                                                ? "border-0 bg-gradient-to-r from-emerald-500 to-teal-600 text-white"
                                                                : ""
                                                        }
                                                        variant={it.is_published ? "secondary" : "outline"}
                                                    >
                                                        {it.is_published ? "published" : "draft"}
                                                    </Badge>
                                                </TableCell>

                                                <TableCell className="text-right">
                                                    <form
                                                        action={async () => {
                                                            "use server";
                                                            await togglePublishAction(it.id, !it.is_published);
                                                        }}
                                                    >
                                                        <Button size="sm" variant="outline" type="submit">
                                                            {it.is_published ? "Unpublish" : "Publish"}
                                                        </Button>
                                                    </form>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card className="border-0 bg-white shadow-xl">
                    <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                        <div>
                            <CardTitle className="flex items-center gap-2">
                                <Paintbrush className="h-5 w-5 text-fuchsia-600" />
                                Artwork
                            </CardTitle>
                            <CardDescription>
                                {artworkItems.length} item{artworkItems.length === 1 ? "" : "s"}
                            </CardDescription>
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
                        ) : artworkItems.length === 0 ? (
                            <div className="rounded-lg border bg-background p-6">
                                <div className="text-sm font-medium">No artwork items yet</div>
                                <div className="mt-1 text-sm text-muted-foreground">
                                    Add your first artwork item above.
                                </div>
                            </div>
                        ) : (
                            <div className="rounded-lg border">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Title</TableHead>
                                            <TableHead>Category</TableHead>
                                            <TableHead>Sort</TableHead>
                                            <TableHead>Published</TableHead>
                                            <TableHead className="text-right">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>

                                    <TableBody>
                                        {artworkItems.map((it) => (
                                            <TableRow key={it.id}>
                                                <TableCell className="font-medium">
                                                    <Link
                                                        href={`/admin/portfolio/${it.id}/edit`}
                                                        className="underline-offset-4 hover:underline"
                                                    >
                                                        {it.title}
                                                    </Link>
                                                </TableCell>

                                                <TableCell className="text-muted-foreground">{it.category ?? "—"}</TableCell>
                                                <TableCell className="text-muted-foreground">{it.sort_order}</TableCell>

                                                <TableCell>
                                                    <Badge
                                                        className={
                                                            it.is_published
                                                                ? "border-0 bg-gradient-to-r from-emerald-500 to-teal-600 text-white"
                                                                : ""
                                                        }
                                                        variant={it.is_published ? "secondary" : "outline"}
                                                    >
                                                        {it.is_published ? "published" : "draft"}
                                                    </Badge>
                                                </TableCell>

                                                <TableCell className="text-right">
                                                    <form
                                                        action={async () => {
                                                            "use server";
                                                            await togglePublishAction(it.id, !it.is_published);
                                                        }}
                                                    >
                                                        <Button size="sm" variant="outline" type="submit">
                                                            {it.is_published ? "Unpublish" : "Publish"}
                                                        </Button>
                                                    </form>
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

            <Card className="border-0 bg-white shadow-xl">
                <CardHeader>
                    <CardTitle>All Items</CardTitle>
                    <CardDescription>
                        {items.length} total item{items.length === 1 ? "" : "s"}
                    </CardDescription>
                </CardHeader>

                <CardContent>
                    {items.length === 0 ? (
                        <div className="rounded-lg border bg-background p-6">
                            <div className="text-sm font-medium">No items yet</div>
                        </div>
                    ) : (
                        <div className="rounded-lg border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Title</TableHead>
                                        <TableHead>Type</TableHead>
                                        <TableHead>Category</TableHead>
                                        <TableHead>Sort</TableHead>
                                        <TableHead>Published</TableHead>
                                        <TableHead className="text-right">Created</TableHead>
                                    </TableRow>
                                </TableHeader>

                                <TableBody>
                                    {items.map((it) => (
                                        <TableRow key={it.id}>
                                            <TableCell className="font-medium">
                                                <Link
                                                    href={`/admin/portfolio/${it.id}/edit`}
                                                    className="underline-offset-4 hover:underline"
                                                >
                                                    {it.title}
                                                </Link>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline">{prettyItemType(it.item_type)}</Badge>
                                            </TableCell>
                                            <TableCell className="text-muted-foreground">{it.category ?? "—"}</TableCell>
                                            <TableCell className="text-muted-foreground">{it.sort_order}</TableCell>
                                            <TableCell>
                                                <Badge
                                                    className={
                                                        it.is_published
                                                            ? "border-0 bg-gradient-to-r from-emerald-500 to-teal-600 text-white"
                                                            : ""
                                                    }
                                                    variant={it.is_published ? "secondary" : "outline"}
                                                >
                                                    {it.is_published ? "published" : "draft"}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right text-muted-foreground">
                                                {fmtDate(it.created_at)}
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