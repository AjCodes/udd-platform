import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

// Server-side Supabase client with Service Role Key for admin updates
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
    try {
        const { userId, email, phone, fullName } = await request.json();

        if (!userId || !phone) {
            return NextResponse.json({ error: 'User ID and phone are required' }, { status: 400 });
        }

        // Upsert user profile with service role (bypasses RLS)
        const { error } = await supabase
            .from('users')
            .upsert({
                id: userId,
                email: email || '',
                phone: phone,
                full_name: fullName || null,
            }, { onConflict: 'id' });

        if (error) {
            console.error('[Profile API] Upsert error:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (err: unknown) {
        console.error('[Profile API] Error:', err);
        const message = err instanceof Error ? err.message : 'Unknown error';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
