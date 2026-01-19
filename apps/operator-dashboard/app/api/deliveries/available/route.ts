import { NextResponse } from 'next/server';
import { createServerClient } from '@udd/shared';

export const dynamic = 'force-dynamic';

// GET /api/deliveries/available - List pending (unclaimed) deliveries
export async function GET() {
    try {
        const supabase = createServerClient();

        // Fetch deliveries with status 'pending'
        const { data, error } = await supabase
            .from('deliveries')
            .select('*, drones(name)')
            .eq('status', 'pending')
            .order('created_at', { ascending: true });

        if (error) {
            console.error('[AvailableDeliveriesAPI] Query failed:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json(data || []);
    } catch (error) {
        console.error('[AvailableDeliveriesAPI] Unexpected error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

