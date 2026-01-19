import { NextResponse } from 'next/server';
import { createServerClient } from '@udd/shared';

export const dynamic = 'force-dynamic';

// GET /api/deliveries/my-active - Get operator's active deliveries
export async function GET() {
    try {
        const supabase = createServerClient();

        // Get deliveries with status 'assigned' or 'in_transit'
        const { data, error } = await supabase
            .from('deliveries')
            .select('*, drones(name)')
            .in('status', ['assigned', 'in_transit'])
            .order('updated_at', { ascending: false });

        if (error) {
            console.error('[MyActiveDeliveriesAPI] Query failed:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json(data || []);
    } catch (error) {
        console.error('[MyActiveDeliveriesAPI] Unexpected error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
