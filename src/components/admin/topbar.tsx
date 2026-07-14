"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Separator } from "@/components/ui/separator";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { LogOut, Settings } from "lucide-react";
import { toast } from "sonner";
import QuickAddMenu from "@/components/admin/quick-add-menu";
import GlobalSearch from "@/components/admin/global-search";

function pageTitle(pathname: string) {
    if (pathname === "/admin") return "Dashboard";
    if (pathname.startsWith("/admin/clients")) return "Clients";
    if (pathname.startsWith("/admin/projects")) return "Projects";
    if (pathname.startsWith("/admin/invoices")) return "Invoices";
    if (pathname.startsWith("/admin/portfolio")) return "Portfolio";
    if (pathname.startsWith("/admin/leads")) return "Leads";
    if (pathname.startsWith("/admin/reports")) return "Reports";
    if (pathname.startsWith("/admin/settings")) return "Settings";
    return "Admin";
}

export default function Topbar() {
    const pathname = usePathname();
    const router = useRouter();
    const title = useMemo(() => pageTitle(pathname), [pathname]);
    const [loggingOut, setLoggingOut] = useState(false);

    async function onLogout() {
        setLoggingOut(true);

        try {
            const supabase = createClient();
            const { error } = await supabase.auth.signOut();

            if (error) {
                toast.error(error.message);
                return;
            }

            router.push("/login");
            router.refresh();
        } finally {
            setLoggingOut(false);
        }
    }

    return (
        <header className="sticky top-0 z-40 border-b border-white/10 bg-[#090914]/70 backdrop-blur-xl supports-[backdrop-filter]:bg-[#090914]/70">
            <div className="flex items-center gap-3 px-5 py-4 md:px-6">
                <div className="min-w-0 flex-1">
                    <div className="truncate text-base font-semibold text-white">{title}</div>
                    <div className="text-xs text-white/55">
                        Manage clients, projects, invoices, portfolio, and reports
                    </div>
                </div>

                <div className="hidden w-[420px] max-w-[42vw] md:block">
                    <div className="rounded-xl transition">
                        <GlobalSearch placeholder="Search clients, projects, invoices..." />
                    </div>
                </div>

                <Separator orientation="vertical" className="hidden h-7 bg-white/10 md:block" />

                <div className="hidden md:block">
                    <div className="rounded-xl transition">
                        <QuickAddMenu />
                    </div>
                </div>

                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button
                            type="button"
                            variant="ghost"
                            className="h-11 cursor-pointer rounded-xl px-2 text-white transition hover:bg-white/10 hover:text-white focus-visible:ring-2 focus-visible:ring-cyan-400/60 data-[state=open]:bg-white/10 data-[state=open]:text-white disabled:cursor-not-allowed disabled:opacity-60"
                            aria-label="Open admin menu"
                        >
                            <Avatar className="h-8 w-8 border border-white/10 transition group-hover:border-white/20">
                                <AvatarFallback className="bg-gradient-to-r from-fuchsia-500 to-purple-600 text-xs text-white">
                                    DIC
                                </AvatarFallback>
                            </Avatar>
                        </Button>
                    </DropdownMenuTrigger>

                    <DropdownMenuContent
                        align="end"
                        className="w-56 border-white/10 bg-[#11111d]/95 text-white backdrop-blur-xl"
                    >
                        <DropdownMenuLabel className="text-white">Admin</DropdownMenuLabel>
                        <DropdownMenuSeparator className="bg-white/10" />

                        <DropdownMenuItem
                            asChild
                            className="cursor-pointer text-white outline-none transition hover:bg-white/10 focus:bg-white/10 focus:text-white"
                        >
                            <Link href="/admin/settings" className="flex items-center gap-2">
                                <Settings className="h-4 w-4" />
                                Settings
                            </Link>
                        </DropdownMenuItem>

                        <DropdownMenuSeparator className="bg-white/10" />

                        <DropdownMenuItem
                            className="cursor-pointer text-white outline-none transition hover:bg-red-500/10 focus:bg-red-500/10 focus:text-white disabled:cursor-not-allowed disabled:opacity-60"
                            onClick={onLogout}
                            disabled={loggingOut}
                        >
                            <div className="flex items-center gap-2">
                                <LogOut className="h-4 w-4" />
                                {loggingOut ? "Logging out..." : "Logout"}
                            </div>
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>

            <div className="px-4 pb-3 md:hidden">
                <div className="w-full rounded-xl transition">
                    <GlobalSearch placeholder="Search..." />
                </div>

                <div className="mt-3 rounded-xl transition">
                    <QuickAddMenu />
                </div>
            </div>
        </header>
    );
}