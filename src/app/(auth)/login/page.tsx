// FILE: src/app/(auth)/login/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
    ArrowLeft,
    KeyRound,
    Loader2,
    Mail,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function LoginPage() {
    const router = useRouter();
const [nextPath, setNextPath] = useState("/admin");

useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const next = params.get("next");

    if (next && next.startsWith("/") && !next.startsWith("//")) {
        setNextPath(next);
    }
}, []);

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function onSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (loading) return;

        setError(null);
        setLoading(true);

        try {
            const supabase = createClient();
            const { error: authError } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (authError) {
                setError(authError.message);
                return;
            }

            router.push(nextPath);
            router.refresh();
        } catch (err: any) {
            setError(err?.message || "Login failed.");
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="min-h-dvh bg-[#080812] text-white">
            <div className="relative min-h-dvh overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(122,60,255,0.22),transparent_28%),radial-gradient(circle_at_top_right,rgba(0,229,255,0.16),transparent_30%),radial-gradient(circle_at_bottom_left,rgba(255,46,136,0.16),transparent_28%),linear-gradient(180deg,#090914_0%,#0d0d18_100%)]" />

                <div className="absolute inset-0 opacity-30">
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

                <div className="relative mx-auto flex min-h-dvh max-w-[1400px] items-center justify-center px-6 py-8">
                    <div className="w-full max-w-md">
                        <Card className="border-white/10 bg-white/8 py-12 shadow-2xl backdrop-blur-xl">
                            <CardHeader className="space-y-5">
                                <div className="flex flex-col items-center text-center">
                                    <div className="flex h-16 w-16 items-center justify-center overflow-hidden p-2">
                                        <img
                                            src="/w_logo.png"
                                            alt="Dream in Color logo"
                                            className="h-full w-full object-contain"
                                        />
                                    </div>

                                    <CardTitle className="mt-1 text-2xl text-white">
                                        Dream in Color
                                    </CardTitle>

                                    <CardDescription className="mt-1 text-white/60">
                                        Sign in to the admin portal
                                    </CardDescription>
                                </div>
                            </CardHeader>

                            <CardContent className="space-y-5">
                                <form className="space-y-4" onSubmit={onSubmit}>
                                    <div className="space-y-2">
                                        <Label htmlFor="email" className="flex items-center gap-2 text-white/85">
                                            <Mail className="h-4 w-4 text-cyan-300" />
                                            Email
                                        </Label>

                                        <Input
                                            id="email"
                                            type="email"
                                            placeholder="hello@dreamincolor.co.za"
                                            autoComplete="email"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            required
                                            disabled={loading}
                                            className="border-white/10 bg-white/5 text-white placeholder:text-white/35 disabled:cursor-not-allowed disabled:opacity-70"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="password" className="flex items-center gap-2 text-white/85">
                                            <KeyRound className="h-4 w-4 text-fuchsia-300" />
                                            Password
                                        </Label>

                                        <Input
                                            id="password"
                                            type="password"
                                            placeholder="••••••••"
                                            autoComplete="current-password"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            required
                                            disabled={loading}
                                            className="border-white/10 bg-white/5 text-white placeholder:text-white/35 disabled:cursor-not-allowed disabled:opacity-70"
                                        />
                                    </div>

                                    {error ? (
                                        <div className="rounded-md border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
                                            {error}
                                        </div>
                                    ) : null}

                                    <div className="grid grid-cols-2 gap-3 pt-1">
                                        <Button
                                            type="submit"
                                            disabled={loading}
                                            className="border-0 bg-gradient-to-r from-fuchsia-500 to-purple-600 text-white shadow-lg shadow-fuchsia-500/25 hover:from-fuchsia-500 hover:to-purple-600 disabled:opacity-80"
                                        >
                                            {loading ? (
                                                <span className="flex items-center gap-2">
                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                    Signing in...
                                                </span>
                                            ) : (
                                                "Sign in"
                                            )}
                                        </Button>

                                        <Button
                                            asChild
                                            type="button"
                                            variant="outline"
                                            disabled={loading}
                                            className="border-white/15 bg-white/5 text-white hover:bg-white/10 hover:text-white disabled:pointer-events-none disabled:opacity-60"
                                        >
                                            <Link href="/" className="flex items-center gap-2">
                                                <ArrowLeft className="h-4 w-4" />
                                                Back to site
                                            </Link>
                                        </Button>
                                    </div>

                                    {loading ? (
                                        <div className="flex items-center justify-center gap-2 pt-1 text-xs text-white/55">
                                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                            Authenticating your session...
                                        </div>
                                    ) : null}
                                </form>
                            </CardContent>
                        </Card>

                        <div className="mt-4 text-center text-xs text-white/40">
                            © {new Date().getFullYear()} Dream in Color Studios
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}