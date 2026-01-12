import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@shared/supabase';

// GET /api/deliveries/available - List pending (unclaimed) deliveries
export async function GET(request: NextRequest) {
    try {
        const supabase = createServerClient();

        // Get authenticated user
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Check if user is an operator
        const { data: profile, error: profileError } = await supabase
            .from('users')
            .select('role')
            .eq('id', user.id)
            .single();

        if (profileError || profile?.role !== 'operator') {
            return NextResponse.json({ error: 'Forbidden - operators only' }, { status: 403 });
        }

        // Fetch pending deliveries
        const { data, error } = await supabase
            .from('deliveries')
            .select('*')
            .eq('status', 'pending')
            .order('created_at', { ascending: true });

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json(data);
    } catch (error) {
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
