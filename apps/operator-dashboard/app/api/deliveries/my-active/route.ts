import { NextResponse } from 'next/server';
import { createServerClient } from '@udd/shared';

// GET /api/deliveries/my-active - Get operator's active deliveries
export async function GET() {
    try {
        const supabase = createServerClient();

        // For now, get all non-pending, non-delivered deliveries
        // In production, filter by operator_id from auth
        const { data, error } = await supabase
            .from('deliveries')
            .select('*')
            .in('status', ['assigned', 'in_transit'])
            .order('updated_at', { ascending: false });

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json(data);
    } catch (error) {
        console.error('Failed to fetch active deliveries:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
