// FILE: src/components/admin/sidebar.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
    LayoutDashboard,
    Users,
    FolderKanban,
    Receipt,
    Briefcase,
    Mail,
    BarChart3,
} from "lucide-react";

type NavItem = {
    label: string;
    href: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: string;
};

const navItems: NavItem[] = [
    { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
    { label: "Clients", href: "/admin/clients", icon: Users },
    { label: "Projects", href: "/admin/projects", icon: FolderKanban },
    { label: "Invoices", href: "/admin/invoices", icon: Receipt, badge: "New" },
    { label: "Portfolio", href: "/admin/portfolio", icon: Briefcase },
    { label: "Leads", href: "/admin/leads", icon: Mail },
    { label: "Reports", href: "/admin/reports", icon: BarChart3 },
];

export default function Sidebar() {
    const pathname = usePathname();

    return (
        <aside className="sticky top-0 hidden h-dvh w-[280px] shrink-0 border-r border-white/10 bg-[#090914]/55 backdrop-blur-xl md:flex md:flex-col">
            <div className="flex items-center gap-3 px-5 py-4">
                <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-4xl border border-white/10 bg-white shadow-lg shadow-fuchsia-500/10">
                    <img
                        src="/logo.png"
                        alt="Dream in Color logo"
                        className="h-full w-full object-contain"
                    />
                </div>

                <div className="leading-tight">
                    <div className="text-sm font-semibold text-white">Dream in Color</div>
                    <div className="text-xs text-white/55">Admin Portal</div>
                </div>
            </div>

            <Separator className="bg-white/10" />

            <nav className="flex flex-1 flex-col gap-1 p-3">
                {navItems.map((item) => {
                    const active =
                        pathname === item.href ||
                        (item.href !== "/admin" && pathname.startsWith(item.href));

                    const Icon = item.icon;

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                                "group flex items-center justify-between rounded-xl px-3 py-2.5 text-sm transition-all",
                                active
                                    ? "border border-white/10 bg-gradient-to-r from-fuchsia-500/20 to-purple-600/20 text-white shadow-md shadow-fuchsia-500/10"
                                    : "text-white/70 hover:bg-white/8 hover:text-white"
                            )}
                        >
                            <span className="flex items-center gap-2">
                                <Icon className={cn("h-4 w-4", active ? "text-fuchsia-300" : "text-white/60")} />
                                {item.label}
                            </span>

                            {item.badge ? (
                                <Badge
                                    variant="secondary"
                                    className="h-5 border-0 bg-gradient-to-r from-cyan-500 to-blue-600 px-2 text-[10px] text-white"
                                >
                                    {item.badge}
                                </Badge>
                            ) : null}
                        </Link>
                    );
                })}
            </nav>

            <div className="p-3">
                <div className="rounded-xl border border-white/10 bg-white/5 p-3 backdrop-blur">
                    <div className="text-xs font-medium text-white">Quick status</div>
                    <div className="mt-1 text-xs text-white/55">
                        System live. Track projects, invoices, leads, and reports.
                    </div>
                </div>
            </div>
        </aside>
    );
}