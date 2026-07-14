// FILE: middleware.ts
import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function middleware(request: NextRequest) {
    // Create a response we can attach cookies to
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
                    // Update request cookies (so getUser sees latest in this request)
                    request.cookies.set({ name, value, ...options });
                    // And update response cookies (so browser stores it)
                    response.cookies.set({ name, value, ...options });
                },
                remove(name: string, options: any) {
                    request.cookies.set({ name, value: "", ...options });
                    response.cookies.set({ name, value: "", ...options });
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
        // IMPORTANT: return a redirect response and carry cookies over
        const redirectResponse = NextResponse.redirect(url);
        // copy cookies supabase may have set
        redirectResponse.cookies.set(response.cookies);
        return redirectResponse;
    }

    // If logged in and visiting /login, respect ?next=
    if (pathname === "/login" && user) {
        const nextParam = request.nextUrl.searchParams.get("next");
        const target = nextParam && nextParam.startsWith("/") ? nextParam : "/admin";

        const url = request.nextUrl.clone();
        url.pathname = target;
        url.search = "";
        const redirectResponse = NextResponse.redirect(url);
        redirectResponse.cookies.set(response.cookies);
        return redirectResponse;
    }

    return response;
}

export const config = {
    matcher: ["/admin/:path*", "/login"],
};