// FILE: middleware.ts

import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function middleware(request: NextRequest) {
    let response = NextResponse.next({
        request: {
            headers: request.headers,
        },
    });

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
        {
            cookies: {
                get(name: string) {
                    return request.cookies.get(name)?.value;
                },

                set(name: string, value: string, options: any) {
                    request.cookies.set({
                        name,
                        value,
                        ...options,
                    });

                    response.cookies.set({
                        name,
                        value,
                        ...options,
                    });
                },

                remove(name: string, options: any) {
                    request.cookies.set({
                        name,
                        value: "",
                        ...options,
                    });

                    response.cookies.set({
                        name,
                        value: "",
                        ...options,
                    });
                },
            },
        }
    );

    const {
        data: { user },
    } = await supabase.auth.getUser();

    const pathname = request.nextUrl.pathname;
    const isAdminRoute = pathname.startsWith("/admin");

    // Protect admin routes
    if (isAdminRoute && !user) {
        const url = request.nextUrl.clone();

        url.pathname = "/login";
        url.searchParams.set("next", pathname);

        const redirectResponse = NextResponse.redirect(url);

        // Copy all Supabase cookies to the redirect response
        response.cookies.getAll().forEach((cookie) => {
            redirectResponse.cookies.set(cookie);
        });

        return redirectResponse;
    }

    // Redirect authenticated users away from login
    if (pathname === "/login" && user) {
        const nextParam = request.nextUrl.searchParams.get("next");

        const target =
            nextParam && nextParam.startsWith("/")
                ? nextParam
                : "/admin";

        const url = request.nextUrl.clone();

        url.pathname = target;
        url.search = "";

        const redirectResponse = NextResponse.redirect(url);

        // Copy all Supabase cookies to the redirect response
        response.cookies.getAll().forEach((cookie) => {
            redirectResponse.cookies.set(cookie);
        });

        return redirectResponse;
    }

    return response;
}

export const config = {
    matcher: ["/admin/:path*", "/login"],
};