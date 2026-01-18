import { NextResponse } from 'next/server';
import { createServerClient } from '@udd/shared';

// GET /api/deliveries - List all deliveries (uses service role key to bypass RLS)
export async function GET() {
    try {
        const supabase = createServerClient();
        
        console.log('[DeliveriesAPI] Using Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
        console.log('[DeliveriesAPI] Service role key:', process.env.SUPABASE_SERVICE_ROLE_KEY ? 'set' : 'missing');

        // First, verify connection and get total count
        const { count: totalCount, error: countError } = await supabase
            .from('deliveries')
            .select('*', { count: 'exact', head: true });
        
        if (countError) {
            console.error('[DeliveriesAPI] Error counting deliveries:', countError);
        } else {
            console.log('[DeliveriesAPI] 📊 Total deliveries in database (count query):', totalCount || 0);
        }

        // CRITICAL FIX: Use REST API directly since JS client has RLS bypass issues
        // Service role key in REST API headers properly bypasses RLS
        let data: any[] | null = null;
        let error: any = null;

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (!supabaseUrl || !serviceKey) {
            console.error('[DeliveriesAPI] Missing Supabase URL or service key');
            return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
        }

        // Use REST API directly - this properly bypasses RLS with service role key
        try {
            console.log('[DeliveriesAPI] Using REST API to bypass RLS...');
            const restResponse = await fetch(
                `${supabaseUrl}/rest/v1/deliveries?select=*&order=created_at.desc&limit=100`,
                {
                    headers: {
                        'apikey': serviceKey,
                        'Authorization': `Bearer ${serviceKey}`,
                        'Content-Type': 'application/json',
                        'Prefer': 'return=representation'
                    }
                }
            );

            if (restResponse.ok) {
                const restData = await restResponse.json();
                console.log('[DeliveriesAPI] ✅ REST API returned:', restData.length, 'deliveries');
                data = restData;
                error = null;
            } else {
                const restErrorText = await restResponse.text();
                console.error('[DeliveriesAPI] REST API failed:', restResponse.status, restErrorText);
                error = { message: `REST API error: ${restResponse.status}`, details: restErrorText };
                
                // Fallback to JS client if REST fails
                console.log('[DeliveriesAPI] Falling back to JS client...');
                const fallbackQuery = await supabase
                    .from('deliveries')
                    .select('*')
                    .order('created_at', { ascending: false })
                    .limit(100);
                
                data = fallbackQuery.data;
                error = fallbackQuery.error;
            }
        } catch (restError) {
            console.error('[DeliveriesAPI] REST API fetch error:', restError);
            // Fallback to JS client
            console.log('[DeliveriesAPI] Falling back to JS client due to fetch error...');
            const fallbackQuery = await supabase
                .from('deliveries')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(100);
            
            data = fallbackQuery.data;
            error = fallbackQuery.error;
        }

        if (error) {
            console.error('[DeliveriesAPI] ❌ Failed to fetch deliveries:', error);
            console.error('[DeliveriesAPI] Error code:', error.code);
            console.error('[DeliveriesAPI] Error message:', error.message);
            console.error('[DeliveriesAPI] Error details:', JSON.stringify(error, null, 2));
            
            // If it's an RLS error, this means service role isn't working
            if (error.message?.includes('row-level security') || error.code === '42501') {
                console.error('[DeliveriesAPI] ⚠️ RLS POLICY BLOCKING ACCESS! Service role key may not be working!');
            }
            
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        console.log('[DeliveriesAPI] Fetched', data?.length || 0, 'deliveries via REST API');
        
        if (!data || data.length === 0) {
            if (totalCount && totalCount > 0) {
                console.warn('[DeliveriesAPI] ⚠️ REST API returned 0 deliveries but count says:', totalCount);
            }
        } else {
            // Log detailed breakdown
            const statusCounts = data.reduce((acc: Record<string, number>, d: any) => {
                acc[d.status] = (acc[d.status] || 0) + 1;
                return acc;
            }, {});
            console.log('[DeliveriesAPI] Status breakdown:', statusCounts);
            console.log('[DeliveriesAPI] Active deliveries (pending/assigned/in_transit):', 
                data.filter((d: any) => ['pending', 'assigned', 'in_transit'].includes(d.status)).length
            );
            
            if (data.length > 0) {
                console.log('[DeliveriesAPI] Most recent delivery:', {
                    id: data[0].id.slice(0, 8),
                    status: data[0].status,
                    user_id: data[0].user_id?.slice(0, 8),
                    created_at: data[0].created_at
                });
            }
        }

        return NextResponse.json(data || []);
    } catch (error) {
        console.error('[DeliveriesAPI] Unexpected error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
