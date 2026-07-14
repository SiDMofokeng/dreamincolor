// FILE: src/app/(admin)/admin/portfolio/[id]/edit/page.tsx
import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import DeletePortfolioButton from "@/components/admin/delete-portfolio-button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
    ArrowLeft,
    Eye,
    ImagePlus,
    Paintbrush,
    Pencil,
    Plus,
    Save,
    Briefcase,
} from "lucide-react";

type PageProps = {
    params: Promise<{ id: string }>;
};

type ArtworkImageRow = {
    id: string;
    portfolio_item_id: string;
    image_url: string;
    sort_order: number;
    created_at: string;
};

function normalizeItemType(v: string | null | undefined) {
    return String(v ?? "project").trim().toLowerCase() === "artwork" ? "artwork" : "project";
}

function prettyItemType(v: string | null | undefined) {
    return normalizeItemType(v) === "artwork" ? "artwork" : "project";
}

export default async function EditPortfolioItemPage({ params }: PageProps) {
    const { id } = await params;

    const supabase = await createClient();
    const { data: userRes } = await supabase.auth.getUser();
    if (!userRes?.user) redirect("/login");

    const { data: item, error } = await supabase
        .from("portfolio_items")
        .select("id,title,item_type,category,description,image_url,project_url,sort_order,is_published,created_at")
        .eq("id", id)
        .maybeSingle();

    if (error) {
        return (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
                {error.message}
            </div>
        );
    }
    if (!item) notFound();

    const itemType = normalizeItemType(item.item_type);

    async function updateItemAction(formData: FormData) {
        "use server";

        const supabase = await createClient();

        const title = String(formData.get("title") ?? "").trim();
        const item_type = normalizeItemType(String(formData.get("item_type") ?? "project"));
        const category = String(formData.get("category") ?? "").trim() || null;
        const description = String(formData.get("description") ?? "").trim() || null;
        const image_url = String(formData.get("image_url") ?? "").trim() || null;
        const project_url = String(formData.get("project_url") ?? "").trim() || null;
        const sort_order = Number(formData.get("sort_order") ?? 0);
        const is_published = formData.get("is_published") === "on";

        if (!title) return { ok: false, message: "Title is required." };
        if (!Number.isFinite(sort_order)) return { ok: false, message: "Sort order must be a number." };

        const { error } = await supabase
            .from("portfolio_items")
            .update({
                title,
                item_type,
                category,
                description,
                image_url,
                project_url,
                sort_order,
                is_published,
                updated_at: new Date().toISOString(),
            })
            .eq("id", id);

        if (error) return { ok: false, message: error.message };

        revalidatePath("/admin/portfolio");
        revalidatePath(`/admin/portfolio/${id}/edit`);
        revalidatePath("/");
        return { ok: true as const };
    }

    async function deleteItemAction() {
        "use server";

        const supabase = await createClient();

        const { error } = await supabase.from("portfolio_items").delete().eq("id", id);
        if (error) return { ok: false, message: error.message };

        revalidatePath("/admin/portfolio");
        revalidatePath("/");
        redirect("/admin/portfolio");
    }

    async function addArtworkImageAction(formData: FormData) {
        "use server";

        const supabase = await createClient();

        const image_url = String(formData.get("image_url") ?? "").trim();
        const sort_order = Number(formData.get("sort_order") ?? 0);

        if (!image_url) return { ok: false, message: "Image URL is required." };
        if (!Number.isFinite(sort_order)) return { ok: false, message: "Sort order must be a number." };

        const { error } = await supabase.from("portfolio_item_images").insert({
            portfolio_item_id: id,
            image_url,
            sort_order,
        });

        if (error) return { ok: false, message: error.message };

        revalidatePath(`/admin/portfolio/${id}/edit`);
        revalidatePath("/admin/portfolio");
        revalidatePath("/");
        return { ok: true as const };
    }

    async function deleteArtworkImageAction(imageId: string) {
        "use server";

        const supabase = await createClient();

        const { error } = await supabase
            .from("portfolio_item_images")
            .delete()
            .eq("id", imageId)
            .eq("portfolio_item_id", id);

        if (error) return { ok: false, message: error.message };

        revalidatePath(`/admin/portfolio/${id}/edit`);
        revalidatePath("/admin/portfolio");
        revalidatePath("/");
        return { ok: true as const };
    }

    const { data: artworkImagesData, error: artworkImagesError } = await supabase
        .from("portfolio_item_images")
        .select("id,portfolio_item_id,image_url,sort_order,created_at")
        .eq("portfolio_item_id", id)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true });

    const artworkImages = (artworkImagesData ?? []) as ArtworkImageRow[];

    return (
        <div className="space-y-6">
            <div className="rounded-3xl border border-white/10 bg-white/[0.06] p-6 text-white shadow-2xl backdrop-blur-xl">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div className="min-w-0">
                        <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-fuchsia-500/90 to-purple-600/90 px-3 py-1 text-xs font-medium text-white shadow-lg shadow-fuchsia-500/20">
                            <Pencil className="h-3.5 w-3.5" />
                            Edit portfolio item
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                            <h1 className="truncate text-2xl font-semibold tracking-tight">Edit Portfolio Item</h1>
                            <Badge
                                className={
                                    item.is_published
                                        ? "border-0 bg-gradient-to-r from-emerald-500 to-teal-600 text-white"
                                        : ""
                                }
                                variant={item.is_published ? "secondary" : "outline"}
                            >
                                {item.is_published ? "published" : "draft"}
                            </Badge>
                            <Badge variant="outline">{prettyItemType(item.item_type)}</Badge>
                        </div>

                        <p className="mt-1 text-sm text-white/65">{item.title}</p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                        <Button asChild variant="outline" className="border-white/15 bg-white/5 text-white hover:bg-white/10 hover:text-white">
                            <Link href="/admin/portfolio" className="flex items-center gap-2">
                                <ArrowLeft className="h-4 w-4" />
                                Back to Portfolio
                            </Link>
                        </Button>

                        <Button asChild variant="outline" className="border-white/15 bg-white/5 text-white hover:bg-white/10 hover:text-white">
                            <Link href="/" className="flex items-center gap-2">
                                <Eye className="h-4 w-4" />
                                View public site
                            </Link>
                        </Button>
                    </div>
                </div>
            </div>

            <Card className="border-0 bg-white shadow-xl">
                <CardHeader>
                    <CardTitle>Details</CardTitle>
                    <CardDescription>Update the item and publish/unpublish it.</CardDescription>
                </CardHeader>

                <CardContent className="space-y-6">
                    <form action={updateItemAction} className="space-y-4">
                        <div className="grid gap-4 sm:grid-cols-2">
                            <div className="space-y-2">
                                <Label htmlFor="title">Title</Label>
                                <Input id="title" name="title" defaultValue={item.title} required />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="item_type">Item Type</Label>
                                <select
                                    id="item_type"
                                    name="item_type"
                                    defaultValue={itemType}
                                    className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                                >
                                    <option value="project">Project</option>
                                    <option value="artwork">Artwork</option>
                                </select>
                            </div>
                        </div>

                        <div className="grid gap-4 sm:grid-cols-2">
                            <div className="space-y-2">
                                <Label htmlFor="category">Category</Label>
                                <Input id="category" name="category" defaultValue={item.category ?? ""} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="sort_order">Sort order</Label>
                                <Input id="sort_order" name="sort_order" type="number" defaultValue={item.sort_order ?? 0} />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="description">Description</Label>
                            <Textarea id="description" name="description" defaultValue={item.description ?? ""} rows={4} />
                        </div>

                        <div className="grid gap-4 sm:grid-cols-2">
                            <div className="space-y-2">
                                <Label htmlFor="project_url">Project URL</Label>
                                <Input id="project_url" name="project_url" defaultValue={item.project_url ?? ""} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="image_url">Cover Image URL</Label>
                                <Input id="image_url" name="image_url" defaultValue={item.image_url ?? ""} />
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <input
                                id="is_published"
                                name="is_published"
                                type="checkbox"
                                className="h-4 w-4"
                                defaultChecked={!!item.is_published}
                            />
                            <Label htmlFor="is_published">Published</Label>
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
                                <Link href="/admin/portfolio">Cancel</Link>
                            </Button>
                        </div>
                    </form>

                    <div className="pt-2">
                        <div className="text-sm font-semibold">Danger zone</div>
                        <div className="mt-1 text-sm text-muted-foreground">
                            Deleting is permanent.
                        </div>
                        <div className="mt-3">
                            <DeletePortfolioButton title={item.title} onDelete={deleteItemAction} />
                        </div>
                    </div>
                </CardContent>
            </Card>

            {itemType === "artwork" ? (
                <Card className="border-0 bg-white shadow-xl">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <ImagePlus className="h-5 w-5 text-fuchsia-600" />
                            Artwork Images
                        </CardTitle>
                        <CardDescription>
                            Add multiple images for the public artwork carousel.
                        </CardDescription>
                    </CardHeader>

                    <CardContent className="space-y-6">
                        <form action={addArtworkImageAction} className="grid gap-4 md:grid-cols-[1fr_160px_auto]">
                            <div className="space-y-2">
                                <Label htmlFor="art_image_url">Image URL</Label>
                                <Input id="art_image_url" name="image_url" placeholder="https://..." required />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="art_sort_order">Sort order</Label>
                                <Input id="art_sort_order" name="sort_order" type="number" defaultValue={0} />
                            </div>

                            <div className="flex items-end">
                                <Button
                                    type="submit"
                                    className="w-full border-0 bg-gradient-to-r from-fuchsia-500 to-purple-600 text-white hover:from-fuchsia-500 hover:to-purple-600 md:w-auto"
                                >
                                    <Plus className="mr-2 h-4 w-4" />
                                    Add Image
                                </Button>
                            </div>
                        </form>

                        {artworkImagesError ? (
                            <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
                                {artworkImagesError.message}
                            </div>
                        ) : artworkImages.length === 0 ? (
                            <div className="rounded-lg border bg-background p-6">
                                <div className="text-sm font-medium">No artwork images yet</div>
                                <div className="mt-1 text-sm text-muted-foreground">
                                    Add images above to populate the public carousel.
                                </div>
                            </div>
                        ) : (
                            <div className="rounded-lg border">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Image</TableHead>
                                            <TableHead>Sort</TableHead>
                                            <TableHead className="text-right">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>

                                    <TableBody>
                                        {artworkImages.map((img) => (
                                            <TableRow key={img.id}>
                                                <TableCell>
                                                    <div className="flex items-center gap-3">
                                                        <div className="h-14 w-20 overflow-hidden rounded-md border bg-muted/30">
                                                            {img.image_url ? (
                                                                <img
                                                                    src={img.image_url}
                                                                    alt=""
                                                                    className="h-full w-full object-cover"
                                                                />
                                                            ) : null}
                                                        </div>
                                                        <div className="min-w-0 text-sm text-muted-foreground">
                                                            <a
                                                                href={img.image_url}
                                                                target="_blank"
                                                                rel="noreferrer"
                                                                className="break-all underline-offset-4 hover:underline"
                                                            >
                                                                {img.image_url}
                                                            </a>
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-muted-foreground">{img.sort_order}</TableCell>
                                                <TableCell className="text-right">
                                                    <form
                                                        action={async () => {
                                                            "use server";
                                                            await deleteArtworkImageAction(img.id);
                                                        }}
                                                    >
                                                        <Button size="sm" variant="outline" type="submit">
                                                            Delete
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
            ) : null}
        </div>
    );
}