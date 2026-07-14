// FILE: src/app/api/search/route.ts
import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

type SearchItem = {
    type: "client" | "project" | "invoice";
    title: string;
    subtitle?: string;
    href: string;
};

export async function GET(request: NextRequest) {
    const url = new URL(request.url);
    const q = (url.searchParams.get("q") ?? "").trim();

    if (!q || q.length < 2) {
        return NextResponse.json({ items: [] as SearchItem[] });
    }

    const cookieStore = await cookies();
    const response = NextResponse.next();

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
        {
            cookies: {
                get(name: string) {
                    return cookieStore.get(name)?.value;
                },
                set(name: string, value: string, options: any) {
                    cookieStore.set({ name, value, ...options });
                },
                remove(name: string, options: any) {
                    cookieStore.set({ name, value: "", ...options });
                },
            },
        }
    );

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return NextResponse.json({ items: [] as SearchItem[] }, { status: 401 });
    }

    const like = `%${q}%`;

    // Clients: name/contact/email/phone
    const clientsQ = supabase
        .from("clients")
        .select("id,name,contact_person,email,phone")
        .or(
            `name.ilike.${like},contact_person.ilike.${like},email.ilike.${like},phone.ilike.${like}`
        )
        .order("created_at", { ascending: false })
        .limit(5);

    // Projects: title OR client_name (via view)
    const projectsQ = supabase
        .from("projects_search")
        .select("id,title,client_name")
        .or(`title.ilike.${like},client_name.ilike.${like}`)
        .order("created_at", { ascending: false })
        .limit(5);

    // Invoices: invoice_number OR client_name (via view)
    const invoicesQ = supabase
        .from("invoices_search")
        .select("id,invoice_number,client_name,status")
        .or(`invoice_number.ilike.${like},client_name.ilike.${like}`)
        .order("created_at", { ascending: false })
        .limit(5);

    const [clientsRes, projectsRes, invoicesRes] = await Promise.all([
        clientsQ,
        projectsQ,
        invoicesQ,
    ]);

    // If any query errors, return what we have (don’t crash search UX)
    const items: SearchItem[] = [];

    if (!clientsRes.error) {
        for (const c of clientsRes.data ?? []) {
            const subtitle =
                c.contact_person || c.email || c.phone
                    ? [c.contact_person, c.email, c.phone].filter(Boolean).join(" • ")
                    : undefined;

            items.push({
                type: "client",
                title: c.name,
                subtitle,
                href: `/admin/clients/${c.id}`,
            });
        }
    }

    if (!projectsRes.error) {
        for (const p of projectsRes.data ?? []) {
            items.push({
                type: "project",
                title: p.title,
                subtitle: p.client_name ? `Client: ${p.client_name}` : undefined,
                href: `/admin/projects/${p.id}/edit`,
            });
        }
    }

    if (!invoicesRes.error) {
        for (const inv of invoicesRes.data ?? []) {
            items.push({
                type: "invoice",
                title: inv.invoice_number,
                subtitle: [inv.client_name ? `Client: ${inv.client_name}` : null, inv.status ? `Status: ${inv.status}` : null]
                    .filter(Boolean)
                    .join(" • "),
                href: `/admin/invoices/${inv.id}/edit`,
            });
        }
    }

    // return response json (we don't need to set cookies here explicitly)
    return NextResponse.json({ items });
}