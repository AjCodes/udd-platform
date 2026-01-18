import { NextResponse } from 'next/server';
import { createServerClient } from '@udd/shared';

// Handle OAuth callback
export async function GET(request: Request) {
    const requestUrl = new URL(request.url);
    const code = requestUrl.searchParams.get('code');

    if (code) {
        const supabase = createServerClient();

        // Exchange code for session
        const { data: { user }, error } = await supabase.auth.exchangeCodeForSession(code);

        if (!error && user) {
            // Check if user profile exists
            const { data: existingProfile } = await supabase
                .from('users')
                .select('id')
                .eq('id', user.id)
                .single();

            // Create profile if doesn't exist
            if (!existingProfile) {
                await supabase.from('users').insert({
                    id: user.id,
                    email: user.email,
                    full_name: user.user_metadata?.full_name || user.user_metadata?.name,
                    role: 'customer',
                });
            }
        }
    }

    // Redirect to home with success message
    return NextResponse.redirect(new URL('/home?login=success', request.url));
}
