// FILE: src/app/(admin)/admin/layout.tsx
import type { ReactNode } from "react";
import Sidebar from "@/components/admin/sidebar";
import Topbar from "@/components/admin/topbar";
import { Toaster } from "sonner";

function AdminBackdrop() {
    return (
        <>
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(122,60,255,0.18),transparent_28%),radial-gradient(circle_at_top_right,rgba(0,229,255,0.12),transparent_30%),radial-gradient(circle_at_bottom_left,rgba(255,46,136,0.12),transparent_28%),linear-gradient(180deg,#090914_0%,#0d0d18_100%)]" />
            <div className="absolute inset-0 opacity-25">
                <div className="absolute left-[8%] top-[12%] h-72 w-72 rounded-full border border-white/10" />
                <div className="absolute left-[14%] top-[18%] h-48 w-48 rounded-full border border-white/10" />
                <div className="absolute right-[10%] top-[16%] h-80 w-80 rounded-full border border-white/10" />
                <div className="absolute bottom-[12%] left-[18%] h-56 w-56 rounded-full border border-white/10" />
                <div className="absolute bottom-[10%] right-[14%] h-40 w-40 rounded-full border border-white/10" />

                <div className="absolute left-[20%] top-[42%] h-3 w-3 rounded-sm bg-white/60" />
                <div className="absolute left-[34%] top-[24%] h-2 w-2 rounded-full bg-cyan-300/80" />
                <div className="absolute right-[28%] top-[34%] h-3 w-3 rounded-full bg-fuchsia-400/70" />
                <div className="absolute bottom-[24%] right-[22%] h-3 w-3 rounded-sm bg-white/50" />
            </div>
        </>
    );
}

export default function AdminLayout({ children }: { children: ReactNode }) {
    return (
        <div className="relative h-dvh overflow-hidden bg-[#080812] text-foreground">
            <AdminBackdrop />

            <div className="relative mx-auto flex h-dvh w-full max-w-[1400px] overflow-hidden">
                <Sidebar />

                <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
                    <Topbar />

                    <main className="min-w-0 flex-1 overflow-y-auto p-4 md:p-6">
                        {children}
                    </main>
                </div>
            </div>

            <Toaster richColors />
        </div>
    );
}