// FILE: src/lib/supabase/server.ts
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Server Component safe Supabase client.
 * - Can READ cookies.
 * - If Supabase tries to WRITE cookies during render, Next.js will throw.
 *   We catch and ignore those writes here (they will be handled by middleware / actions).
 */
export async function createClient() {
    const cookieStore = await cookies();

    return createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
        {
            cookies: {
                get(name: string) {
                    return cookieStore.get(name)?.value;
                },

                set(name: string, value: string, options: CookieOptions) {
                    try {
                        cookieStore.set({ name, value, ...options });
                    } catch {
                        // Next.js disallows cookie writes in Server Components.
                        // Middleware / Route Handlers / Server Actions will handle session refresh cookies.
                    }
                },

                remove(name: string, options: CookieOptions) {
                    try {
                        cookieStore.set({ name, value: "", ...options });
                    } catch {
                        // Same reason as set()
                    }
                },
            },
        }
    );
}