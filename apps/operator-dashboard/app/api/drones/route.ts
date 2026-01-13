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
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json(data);
    } catch (error) {
        console.error('Failed to fetch drones:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
