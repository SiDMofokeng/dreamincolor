// FILE: src/components/admin/quick-add-menu.tsx
"use client";

import Link from "next/link";
import { useMemo } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Plus, Users, FolderKanban, Receipt } from "lucide-react";

function getClientIdFromPath(pathname: string) {
    // matches /admin/clients/<id> or /admin/clients/<id>/edit
    const m = pathname.match(/^\/admin\/clients\/([^/]+)(?:\/.*)?$/);
    return m?.[1] ?? null;
}

export default function QuickAddMenu() {
    const pathname = usePathname();
    const sp = useSearchParams();

    const clientFromPath = useMemo(() => getClientIdFromPath(pathname), [pathname]);
    const clientFromQuery = sp.get("client");

    const clientId = clientFromPath || clientFromQuery || null;
    const hasClientContext = !!clientId;

    const links = useMemo(() => {
        if (!clientId) {
            return {
                newClient: "/admin/clients",
                newProject: "/admin/projects",
                newInvoice: "/admin/invoices",
            };
        }

        return {
            newClient: "/admin/clients",
            newProject: `/admin/projects?client=${encodeURIComponent(clientId)}`,
            newInvoice: `/admin/invoices?client=${encodeURIComponent(clientId)}`,
        };
    }, [clientId]);

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="outline">
                    <Plus className="mr-2 h-4 w-4" />
                    Quick Add
                </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end" className="w-64">
                <DropdownMenuLabel>
                    {hasClientContext ? "Create (for this client)" : "Create"}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />

                <DropdownMenuItem asChild>
                    <Link href={links.newClient} className="flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        New Client
                    </Link>
                </DropdownMenuItem>

                <DropdownMenuItem asChild>
                    <Link href={links.newProject} className="flex items-center gap-2">
                        <FolderKanban className="h-4 w-4" />
                        {hasClientContext ? "New Project (client)" : "New Project"}
                    </Link>
                </DropdownMenuItem>

                <DropdownMenuItem asChild>
                    <Link href={links.newInvoice} className="flex items-center gap-2">
                        <Receipt className="h-4 w-4" />
                        {hasClientContext ? "New Invoice (client)" : "New Invoice"}
                    </Link>
                </DropdownMenuItem>

                {hasClientContext ? (
                    <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem asChild>
                            <Link href={`/admin/clients/${encodeURIComponent(clientId)}`} className="text-muted-foreground">
                                View client
                            </Link>
                        </DropdownMenuItem>
                    </>
                ) : null}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}