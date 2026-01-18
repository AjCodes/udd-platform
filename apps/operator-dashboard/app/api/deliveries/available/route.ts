import { NextResponse } from 'next/server';
import { createServerClient } from '@udd/shared';

// GET /api/deliveries/available - List pending (unclaimed) deliveries
// Uses REST API to bypass RLS issues with JS client
export async function GET() {
    try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (!supabaseUrl || !serviceKey) {
            return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
        }

        // Use REST API directly to bypass RLS
        const restResponse = await fetch(
            `${supabaseUrl}/rest/v1/deliveries?select=*&status=eq.pending&order=created_at.asc`,
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
            console.error('[AvailableDeliveriesAPI] REST API failed:', restResponse.status, errorText);
            return NextResponse.json({ error: 'Failed to fetch deliveries' }, { status: 500 });
        }

        const data = await restResponse.json();
        console.log('[AvailableDeliveriesAPI] Found', data?.length || 0, 'pending deliveries');
        if (data && data.length > 0) {
            console.log('[AvailableDeliveriesAPI] Most recent pending:', {
                id: data[data.length - 1].id.slice(0, 8),
                created_at: data[data.length - 1].created_at,
                user_id: data[data.length - 1].user_id?.slice(0, 8)
            });
        }

        return NextResponse.json(data || []);
    } catch (error) {
        console.error('[AvailableDeliveriesAPI] Unexpected error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

