import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@shared/supabase';

// GET /api/deliveries/[id] - Get single delivery details
export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const supabase = createServerClient();

        // Get authenticated user
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Fetch delivery (RLS ensures user can only see their own)
        const { data, error } = await supabase
            .from('deliveries')
            .select('*')
            .eq('id', params.id)
            .eq('user_id', user.id)
            .single();

        if (error) {
            return NextResponse.json({ error: 'Delivery not found' }, { status: 404 });
        }

        return NextResponse.json(data);
    } catch (error) {
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
