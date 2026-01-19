import { NextResponse } from 'next/server';
import { createServerClient } from '@udd/shared';

// GET /api/drones - List all drones
export async function GET() {
    try {
        const supabase = createServerClient();

        const { data, error } = await supabase
            .from('drones')
            .select('*')
            .order('name', { ascending: true });

        if (error) {
            console.error('[DronesAPI] Fetch error:', error);
            throw error;
        }

        console.log('[DronesAPI] Fetched', data?.length || 0, 'drones');
        if (data && data.length > 0) {
            const statusCounts = data.reduce((acc: any, d: any) => {
                acc[d.status] = (acc[d.status] || 0) + 1;
                return acc;
            }, {});
            console.log('[DronesAPI] Status breakdown:', statusCounts);
        }

        return NextResponse.json(data || []);
    } catch (error) {
        console.error('Failed to fetch drones:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
