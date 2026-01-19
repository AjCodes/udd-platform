import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';

export function createRoleAwareClient() {
    const cookieStore = cookies();

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    // Create a client with the SERVICE ROLE key but that can still get user auth
    // Note: We use the service key because most operations in the dashboard 
    // need to bypass RLS, but we still need to verify WHO is making the call.
    return createServerClient(
        supabaseUrl,
        supabaseServiceKey,
        {
            cookies: {
                get(name: string) {
                    return cookieStore.get(name)?.value;
                },
                set(name: string, value: string, options: CookieOptions) {
                    try {
                        cookieStore.set({ name, value, ...options });
                    } catch (error) {
                        // Ignore if called from Server Component
                    }
                },
                remove(name: string, options: CookieOptions) {
                    try {
                        cookieStore.set({ name, value: '', ...options });
                    } catch (error) {
                        // Ignore if called from Server Component
                    }
                },
            },
        }
    );
}
