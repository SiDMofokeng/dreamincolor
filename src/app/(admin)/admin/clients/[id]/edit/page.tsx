import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import DeleteClientButton from "@/components/admin/delete-client-button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Pencil, Save, Users } from "lucide-react";

type PageProps = {
    params: Promise<{ id: string }>;
};

export default async function EditClientPage({ params }: PageProps) {
    const { id } = await params;

    const supabase = await createClient();
    const { data: userRes } = await supabase.auth.getUser();
    if (!userRes?.user) redirect("/login");

    const { data: client, error } = await supabase
        .from("clients")
        .select("id,name,contact_person,email,phone,notes,status,created_at")
        .eq("id", id)
        .maybeSingle();

    if (error) {
        return (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
                {error.message}
            </div>
        );
    }

    if (!client) notFound();

    async function updateClientAction(formData: FormData) {
        "use server";

        const supabase = await createClient();

        const name = String(formData.get("name") ?? "").trim();
        const contact_person = String(formData.get("contact_person") ?? "").trim() || null;
        const email = String(formData.get("email") ?? "").trim() || null;
        const phone = String(formData.get("phone") ?? "").trim() || null;
        const notes = String(formData.get("notes") ?? "").trim() || null;
        const status = String(formData.get("status") ?? "active").trim();

        if (!name) return { ok: false, message: "Client name is required." };

        const { error } = await supabase
            .from("clients")
            .update({
                name,
                contact_person,
                email,
                phone,
                notes,
                status,
                updated_at: new Date().toISOString(),
            })
            .eq("id", id);

        if (error) return { ok: false, message: error.message };

        revalidatePath(`/admin/clients/${id}`);
        revalidatePath(`/admin/clients/${id}/edit`);
        revalidatePath("/admin/clients");
        revalidatePath("/admin");
        return { ok: true as const };
    }

    async function deleteClientAction() {
        "use server";

        const supabase = await createClient();
        const { error } = await supabase.from("clients").delete().eq("id", id);

        if (error) return { ok: false, message: error.message };

        revalidatePath("/admin/clients");
        revalidatePath("/admin");
        redirect("/admin/clients");
    }

    return (
        <div className="space-y-6">
            <div className="rounded-3xl border border-white/10 bg-white/[0.06] p-6 text-white shadow-2xl backdrop-blur-xl">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div className="min-w-0">
                        <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-cyan-500/90 to-blue-600/90 px-3 py-1 text-xs font-medium text-white shadow-lg shadow-cyan-500/20">
                            <Pencil className="h-3.5 w-3.5" />
                            Edit client
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                            <h1 className="truncate text-2xl font-semibold tracking-tight">Edit Client</h1>
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

                        <p className="mt-1 text-sm text-white/65">{client.name}</p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                        <Button asChild variant="outline" className="border-white/15 bg-white/5 text-white hover:bg-white/10 hover:text-white">
                            <Link href={`/admin/clients/${id}`} className="flex items-center gap-2">
                                <ArrowLeft className="h-4 w-4" />
                                Back to Client
                            </Link>
                        </Button>

                        <Button asChild variant="outline" className="border-white/15 bg-white/5 text-white hover:bg-white/10 hover:text-white">
                            <Link href="/admin/clients" className="flex items-center gap-2">
                                <Users className="h-4 w-4" />
                                Clients
                            </Link>
                        </Button>
                    </div>
                </div>
            </div>

            <Card className="border-0 bg-white shadow-xl">
                <CardHeader>
                    <CardTitle>Client Details</CardTitle>
                    <CardDescription>Update contact info and notes</CardDescription>
                </CardHeader>

                <CardContent className="space-y-6">
                    <form
    action={async (formData: FormData) => {
        "use server";
        await updateClientAction(formData);
    }}
    className="space-y-4"
>
                        <div className="space-y-2">
                            <Label htmlFor="name">Client / Company Name</Label>
                            <Input id="name" name="name" defaultValue={client.name} required />
                        </div>

                        <div className="grid gap-4 sm:grid-cols-2">
                            <div className="space-y-2">
                                <Label htmlFor="contact_person">Contact Person</Label>
                                <Input
                                    id="contact_person"
                                    name="contact_person"
                                    defaultValue={client.contact_person ?? ""}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="phone">Phone</Label>
                                <Input id="phone" name="phone" defaultValue={client.phone ?? ""} />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="email">Email</Label>
                            <Input id="email" name="email" type="email" defaultValue={client.email ?? ""} />
                        </div>

                        <div className="grid gap-4 sm:grid-cols-2">
                            <div className="space-y-2">
                                <Label htmlFor="status">Status</Label>
                                <Input id="status" name="status" defaultValue={client.status ?? "active"} />
                                <div className="text-xs text-muted-foreground">
                                    For now: type <span className="font-medium">active</span> or{" "}
                                    <span className="font-medium">inactive</span>.
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label>Created</Label>
                                <Input value={new Date(client.created_at).toLocaleString("en-ZA")} readOnly />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="notes">Notes</Label>
                            <Textarea id="notes" name="notes" defaultValue={client.notes ?? ""} rows={5} />
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
                                <Link href={`/admin/clients/${id}`}>Cancel</Link>
                            </Button>
                        </div>
                    </form>

                    <div className="pt-2">
                        <div className="text-sm font-semibold">Danger zone</div>
                        <div className="mt-1 text-sm text-muted-foreground">
                            Deleting a client will remove linked projects and invoices.
                        </div>
                        <div className="mt-3">
                            <DeleteClientButton clientName={client.name} onDelete={deleteClientAction} />
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}