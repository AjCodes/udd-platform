import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Singleton instance for browser client
let browserClientInstance: SupabaseClient | null = null;

// Browser client (for frontend) - uses singleton pattern to prevent multiple instances
export function createBrowserClient(): SupabaseClient {
    // Return existing instance if already created
    if (browserClientInstance) {
        return browserClientInstance;
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
        console.error('[Supabase] Missing env vars');
        console.error('NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? 'set' : 'missing');
        console.error('NEXT_PUBLIC_SUPABASE_ANON_KEY:', supabaseAnonKey ? 'set' : 'missing');
        throw new Error('Missing Supabase environment variables');
    }

    console.log('[Supabase] Creating browser client for', supabaseUrl);
    browserClientInstance = createClient(supabaseUrl, supabaseAnonKey);
    return browserClientInstance;
}

// Server client (for API routes)
export function createServerClient(): SupabaseClient {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl) {
        console.error('[Supabase] NEXT_PUBLIC_SUPABASE_URL is missing');
        throw new Error('NEXT_PUBLIC_SUPABASE_URL is not set');
    }

    if (!supabaseServiceKey) {
        console.error('[Supabase] SUPABASE_SERVICE_ROLE_KEY is missing');
        throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set');
    }

    console.log('[Supabase] Server connecting to', supabaseUrl);
    console.log('[Supabase] Service role key length:', supabaseServiceKey?.length || 0);

    // Create client with service role key - this should bypass RLS automatically
    const client = createClient(supabaseUrl, supabaseServiceKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
            // Ensure we're using service role which bypasses RLS
        },
        db: {
            schema: 'public',
        },
    });

    // Verify the client is using service role by checking if it bypasses RLS
    // Service role key should start with 'eyJ' (JWT token)
    if (!supabaseServiceKey.startsWith('eyJ')) {
        console.warn('[Supabase] ⚠️ Service role key format looks incorrect!');
    }

    return client;
}

// Test connection
export async function testSupabaseConnection(): Promise<boolean> {
    try {
        const supabase = createServerClient();
        const { error } = await supabase.from('drones').select('count').limit(1);

        if (error) {
            console.error('[Supabase] Connection test failed:', error.message);
            return false;
        }

        console.log('[Supabase] Connection test passed');
        return true;
    } catch (error) {
        console.error('[Supabase] Connection test error:', error);
        return false;
    }
}
