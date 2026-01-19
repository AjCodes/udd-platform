import { NextResponse } from 'next/server';
import { createRoleAwareClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// GET /api/deliveries - List all deliveries (uses role-aware client to bypass RLS)
export async function GET() {
    try {
        const supabase = createRoleAwareClient();

        // Check the key source
        const envKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        console.log('[DeliveriesAPI] Client initialized. Key source: .env, Key length:', envKey?.length, 'Starts with eyJ:', envKey?.startsWith('eyJ'));

        // 1. Diagnostic: Check if we can see ANY row in the table (bypass all filters)
        const { data: allData, error: allDataError, count: totalCount } = await supabase
            .from('deliveries')
            .select('*, drones(name)', { count: 'exact' });

        if (allDataError) {
            console.error('[DeliveriesAPI] Query failed:', allDataError);
            return NextResponse.json({ error: allDataError.message }, { status: 500 });
        }

        console.log('[DeliveriesAPI] 📊 Total count:', totalCount);
        console.log('[DeliveriesAPI] ✅ Fetched rows:', allData?.length || 0);

        // 2. Diagnostic: Try raw fetch to REST API
        try {
            const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
            const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim(); // Trim to be safe

            console.log('[DeliveriesAPI] Testing raw REST API fetch...');
            const restRes = await fetch(`${supabaseUrl}/rest/v1/deliveries?select=*`, {
                headers: {
                    'apikey': serviceKey!,
                    'Authorization': `Bearer ${serviceKey}`,
                    'Content-Type': 'application/json',
                }
            });

            if (restRes.ok) {
                const restData = await restRes.json();
                console.log('[DeliveriesAPI] 📡 Raw REST API returned:', restData?.length || 0, 'rows');
                if (restData && restData.length > 0) {
                    console.log('[DeliveriesAPI] 🎯 SUCCESS: Raw fetch found rows! Using raw data as fallback.');
                    return NextResponse.json(restData);
                }
            } else {
                console.error('[DeliveriesAPI] ❌ Raw REST API failed:', restRes.status);
            }
        } catch (restError) {
            console.error('[DeliveriesAPI] Raw REST fetching error:', restError);
        }

        if (totalCount && totalCount > 0 && (!allData || allData.length === 0)) {
            console.warn('[DeliveriesAPI] ⚠️ CRITICAL: Service Role is NOT bypassing RLS! Count is detected but rows are hidden.');

            // Try a different query style to see if it helps
            const { data: retryData } = await supabase.rpc('get_all_deliveries_debug');
            if (retryData) {
                console.log('[DeliveriesAPI] Diagnostic RPC returned:', retryData.length);
            }
        }

        if (allData && allData.length > 0) {
            console.log('[DeliveriesAPI] First delivery status:', allData[0].status);
        }

        return NextResponse.json(allData || []);
    } catch (error) {
        console.error('[DeliveriesAPI] Unexpected error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
