import { Suspense } from "react";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import AddClientDialog from "@/components/admin/add-client-dialog";
import ClientsSearch from "@/components/admin/clients-search";
import DeleteClientButton from "@/components/admin/delete-client-button";
import ClientEditDialog from "@/components/admin/client-edit-dialog";
import ClientStatusSelect from "@/components/admin/client-status-select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
    Pencil,
    Search,
    Sparkles,
    Trash2,
    Users,
    ChevronLeft,
    ChevronRight,
    Download,
} from "lucide-react";

type ClientRow = {
    id: string;
    name: string;
    contact_person: string | null;
    email: string | null;
    phone: string | null;
    notes: string | null;
    status: string;
    created_at: string;
};

type PageProps = {
    searchParams?: Promise<{ q?: string; page?: string; edit?: string }>;
};

function buildClientsUrl(params: { q?: string; page?: number; edit?: string }) {
    const qp = new URLSearchParams();

    if (params.q) qp.set("q", params.q);
    if (params.page && params.page > 1) qp.set("page", String(params.page));
    if (params.edit) qp.set("edit", params.edit);

    const query = qp.toString();
    return `/admin/clients${query ? `?${query}` : ""}`;
}

function normalizeStatus(status: string | null | undefined) {
    return String(status ?? "").trim().toLowerCase();
}

export default async function ClientsPage({ searchParams }: PageProps) {
    const sp = (await searchParams) ?? {};
    const q = (sp.q ? String(sp.q) : "").trim();
    const editId = (sp.edit ? String(sp.edit) : "").trim();

    const parsedPage = Number(sp.page ?? "1");
    const currentPage = Number.isFinite(parsedPage) && parsedPage > 0 ? parsedPage : 1;

    const pageSize = 10;
    const from = (currentPage - 1) * pageSize;
    const to = from + pageSize - 1;

    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) redirect("/login");

    async function createClientAction(formData: FormData) {
        "use server";

        const supabase = await createClient();

        const name = String(formData.get("name") ?? "").trim();
        const contact_person = String(formData.get("contact_person") ?? "").trim() || null;
        const email = String(formData.get("email") ?? "").trim() || null;
        const phone = String(formData.get("phone") ?? "").trim() || null;
        const notes = String(formData.get("notes") ?? "").trim() || null;

        if (!name) return { ok: false, message: "Client name is required." };

        const { error } = await supabase.from("clients").insert({
            name,
            contact_person,
            email,
            phone,
            notes,
            status: "active",
        });

        if (error) return { ok: false, message: error.message };

        revalidatePath("/admin/clients");
        revalidatePath("/admin");
        return { ok: true as const };
    }

    async function updateClientAction(clientId: string, formData: FormData) {
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
            .eq("id", clientId);

        if (error) return { ok: false, message: error.message };

        revalidatePath("/admin/clients");
        revalidatePath(`/admin/clients/${clientId}`);
        revalidatePath(`/admin/clients/${clientId}/edit`);
        revalidatePath("/admin");
        return { ok: true as const };
    }

    async function updateClientStatusAction(formData: FormData) {
        "use server";

        const supabase = await createClient();

        const clientId = String(formData.get("client_id") ?? "").trim();
        const status = normalizeStatus(String(formData.get("status") ?? ""));

        if (!clientId) {
            return { ok: false, message: "Client ID is required." };
        }

        const allowed = ["active", "inactive"];
        if (!allowed.includes(status)) {
            return { ok: false, message: "Invalid status." };
        }

        const { error } = await supabase
            .from("clients")
            .update({
                status,
                updated_at: new Date().toISOString(),
            })
            .eq("id", clientId);

        if (error) {
            return { ok: false, message: error.message };
        }

        revalidatePath("/admin/clients");
        revalidatePath(`/admin/clients/${clientId}`);
        revalidatePath(`/admin/clients/${clientId}/edit`);
        revalidatePath("/admin");

        return { ok: true as const, message: "Client status updated." };
    }

    async function deleteClientAction(clientId: string) {
        "use server";

        const supabase = await createClient();

        const { error } = await supabase.from("clients").delete().eq("id", clientId);

        if (error) return { ok: false, message: error.message };

        revalidatePath("/admin/clients");
        revalidatePath("/admin");
        return { ok: true as const };
    }

    let query = supabase
        .from("clients")
        .select("id,name,contact_person,email,phone,notes,status,created_at", {
    count: "exact",
})
        .order("created_at", { ascending: false });

    if (q) {
        const like = `%${q}%`;
        query = query.or(
            `name.ilike.${like},contact_person.ilike.${like},email.ilike.${like},phone.ilike.${like}`
        );
    }

    const { data, error, count } = await query.range(from, to);
    const clients = (data ?? []) as ClientRow[];

    const totalClients = count ?? 0;
    const totalPages = Math.max(1, Math.ceil(totalClients / pageSize));

    let selectedClient: ClientRow | null = null;

    if (editId) {
        const { data: editClient } = await supabase
            .from("clients")
            .select("id,name,contact_person,email,phone,notes,status,created_at")
            .eq("id", editId)
            .maybeSingle();

        selectedClient = (editClient ?? null) as ClientRow | null;
    }

    const baseListUrl = buildClientsUrl({ q, page: currentPage });
    const downloadHref = `/api/clients/pdf${q ? `?q=${encodeURIComponent(q)}` : ""}`;

    return (
        <div className="space-y-6">
            {selectedClient ? (
                <ClientEditDialog
                    open={true}
                    closeHref={baseListUrl}
                    client={selectedClient}
                    onSave={async (formData) => {
                        "use server";
                        return updateClientAction(selectedClient!.id, formData);
                    }}
                />
            ) : null}

            <div className="rounded-3xl border border-white/10 bg-white/[0.06] p-6 text-white shadow-2xl backdrop-blur-xl">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                        <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-cyan-500/90 to-blue-600/90 px-3 py-1 text-xs font-medium text-white shadow-lg shadow-cyan-500/20">
                            <Users className="h-3.5 w-3.5" />
                            Client management
                        </div>
                        <h1 className="text-2xl font-semibold tracking-tight">Clients</h1>
                        <p className="mt-1 text-sm text-white/65">Manage your client records.</p>
                    </div>

<div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
    <Suspense fallback={<div className="h-10 w-80" />}>
        <ClientsSearch initialQ={q} />
    </Suspense>

    <AddClientDialog onCreate={createClientAction} />
</div>
                </div>
            </div>

            <Card className="border-0 bg-white shadow-xl">
                <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                        <CardTitle className="flex items-center gap-2">
                            <Search className="h-5 w-5 text-cyan-600" />
                            Client List
                        </CardTitle>
                        <CardDescription>
                            {q ? (
                                <>
                                    Showing {clients.length} result{clients.length === 1 ? "" : "s"} for{" "}
                                    <span className="font-medium">“{q}”</span>
                                </>
                            ) : (
                                <>
                                    {totalClients} client{totalClients === 1 ? "" : "s"} total
                                </>
                            )}
                        </CardDescription>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        <Button asChild variant="outline" className="cursor-pointer">
                            <a href={downloadHref} target="_blank" rel="noreferrer" className="flex items-center gap-2">
                                <Download className="h-4 w-4" />
                                Download
                            </a>
                        </Button>

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
                    </div>
                </CardHeader>

                <CardContent>
                    {error ? (
                        <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
                            {error.message}
                        </div>
                    ) : clients.length === 0 ? (
                        <div className="rounded-xl border bg-background p-6">
                            <div className="text-sm font-medium">{q ? "No results found" : "No clients yet"}</div>
                            <div className="mt-1 text-sm text-muted-foreground">
                                {q
                                    ? "Try a different search term."
                                    : "Create your first client to start adding projects and invoices."}
                            </div>
                        </div>
                    ) : (
                        <>
                            <div className="overflow-hidden rounded-xl border">
                                <Table>
                                    <TableHeader className="bg-slate-200/90">
                                        <TableRow className="border-b border-slate-300 hover:bg-slate-200/90">
                                            <TableHead className="font-semibold text-slate-800">Name</TableHead>
                                            <TableHead className="font-semibold text-slate-800">Contact</TableHead>
                                            <TableHead className="font-semibold text-slate-800">Email</TableHead>
                                            <TableHead className="font-semibold text-slate-800">Phone</TableHead>
                                            <TableHead className="font-semibold text-slate-800">Status</TableHead>
                                            <TableHead className="text-right font-semibold text-slate-800">Created</TableHead>
                                            <TableHead className="text-right font-semibold text-slate-800">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>

                                    <TableBody>
                                        {clients.map((c, index) => (
                                            <TableRow
                                                key={c.id}
                                                className={index % 2 === 0 ? "bg-white" : "bg-slate-50/60"}
                                            >
                                                <TableCell className="font-medium">
                                                    <Link
                                                        href={`/admin/clients/${c.id}`}
                                                        className="cursor-pointer underline-offset-4 transition hover:text-cyan-700 hover:underline"
                                                    >
                                                        {c.name}
                                                    </Link>
                                                </TableCell>

                                                <TableCell className="text-muted-foreground">
                                                    {c.contact_person ?? "—"}
                                                </TableCell>

                                                <TableCell className="text-muted-foreground">
                                                    {c.email ?? "—"}
                                                </TableCell>

                                                <TableCell className="text-muted-foreground">
                                                    {c.phone ?? "—"}
                                                </TableCell>

                                                <TableCell>
                                                    <ClientStatusSelect
                                                        clientId={c.id}
                                                        currentStatus={c.status}
                                                        onUpdate={updateClientStatusAction}
                                                    />
                                                </TableCell>

                                                <TableCell className="text-right text-muted-foreground">
                                                    {new Date(c.created_at).toLocaleDateString("en-ZA", {
                                                        year: "numeric",
                                                        month: "short",
                                                        day: "2-digit",
                                                    })}
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
                                                                href={buildClientsUrl({
                                                                    q,
                                                                    page: currentPage,
                                                                    edit: c.id,
                                                                })}
                                                                aria-label={`Edit ${c.name}`}
                                                            >
                                                                <Pencil className="h-4 w-4" />
                                                            </Link>
                                                        </Button>

                                                        <DeleteClientButton
                                                            clientName={c.name}
                                                            onDelete={async () => {
                                                                "use server";
                                                                return deleteClientAction(c.id);
                                                            }}
                                                            trigger={
                                                                <Button
                                                                    type="button"
                                                                    variant="outline"
                                                                    size="icon"
                                                                    aria-label={`Delete ${c.name}`}
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

                            {totalPages > 1 ? (
                                <div className="mt-4 flex items-center justify-between gap-3">
                                    <div className="text-sm text-muted-foreground">
                                        Page <span className="font-medium text-foreground">{currentPage}</span> of{" "}
                                        <span className="font-medium text-foreground">{totalPages}</span>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <Button
                                            asChild
                                            variant="outline"
                                            disabled={currentPage <= 1}
                                            className="cursor-pointer disabled:cursor-not-allowed"
                                        >
                                            <Link
                                                href={buildClientsUrl({
                                                    q,
                                                    page: currentPage - 1,
                                                })}
                                                aria-disabled={currentPage <= 1}
                                            >
                                                <ChevronLeft className="mr-1 h-4 w-4" />
                                                Previous
                                            </Link>
                                        </Button>

                                        <Button
                                            asChild
                                            variant="outline"
                                            disabled={currentPage >= totalPages}
                                            className="cursor-pointer disabled:cursor-not-allowed"
                                        >
                                            <Link
                                                href={buildClientsUrl({
                                                    q,
                                                    page: currentPage + 1,
                                                })}
                                                aria-disabled={currentPage >= totalPages}
                                            >
                                                Next
                                                <ChevronRight className="ml-1 h-4 w-4" />
                                            </Link>
                                        </Button>
                                    </div>
                                </div>
                            ) : null}
                        </>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}