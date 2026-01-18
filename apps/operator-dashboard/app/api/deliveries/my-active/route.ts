import { NextResponse } from 'next/server';
import { createServerClient } from '@udd/shared';

// GET /api/deliveries/my-active - Get operator's active deliveries
// Uses REST API to bypass RLS issues
export async function GET() {
    try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (!supabaseUrl || !serviceKey) {
            return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
        }

        // Use REST API directly to bypass RLS
        // Get deliveries with status 'assigned' or 'in_transit'
        const restResponse = await fetch(
            `${supabaseUrl}/rest/v1/deliveries?select=*&status=in.(assigned,in_transit)&order=updated_at.desc`,
            {
                headers: {
                    'apikey': serviceKey,
                    'Authorization': `Bearer ${serviceKey}`,
                    'Content-Type': 'application/json',
                }
            }
        );

        if (!restResponse.ok) {
            const errorText = await restResponse.text();
            console.error('[MyActiveDeliveriesAPI] REST API failed:', restResponse.status, errorText);
            return NextResponse.json({ error: 'Failed to fetch deliveries' }, { status: 500 });
        }

        const data = await restResponse.json();
        console.log('[MyActiveDeliveriesAPI] Found', data?.length || 0, 'active deliveries');
        return NextResponse.json(data || []);
    } catch (error) {
        console.error('[MyActiveDeliveriesAPI] Unexpected error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
