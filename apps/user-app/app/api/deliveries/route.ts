import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@udd/shared';
import type { CreateDeliveryRequest } from '@udd/shared';

// Helper to get authenticated user from request Authorization header
async function getAuthenticatedUser(request: NextRequest) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

    // Get the access token from Authorization header
    const authHeader = request.headers.get('Authorization');
    const accessToken = authHeader?.replace('Bearer ', '');

    if (!accessToken) {
        console.error('[DeliveriesAPI] No access token in Authorization header');
        return { user: null, supabase: null };
    }

    // Create a Supabase client and verify the token
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
        global: {
            headers: {
                Authorization: `Bearer ${accessToken}`
            }
        }
    });

    const { data: { user }, error } = await supabase.auth.getUser(accessToken);
    if (error || !user) {
        console.error('[DeliveriesAPI] Token verification failed:', error?.message);
        return { user: null, supabase: null };
    }

    return { user, supabase };
}

// POST /api/deliveries - Create a new delivery request
export async function POST(request: NextRequest) {
    try {
        // Get authenticated user from cookies
        const { user } = await getAuthenticatedUser(request);

        if (!user) {
            console.error('[DeliveriesAPI] POST - User not authenticated');
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Use server client (service role) to insert data
        const supabase = createServerClient();

        console.log('[DeliveriesAPI] Creating delivery for user:', user.id);

        // Parse request body
        let body: CreateDeliveryRequest;
        try {
            body = await request.json();
        } catch (parseError) {
            console.error('[DeliveriesAPI] JSON parse error:', parseError);
            return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
        }

        const { pickup_location, dropoff_location, package_description } = body;

        // Validate required fields
        if (!pickup_location || !dropoff_location) {
            console.error('[DeliveriesAPI] Missing locations:', {
                hasPickup: !!pickup_location,
                hasDropoff: !!dropoff_location
            });
            return NextResponse.json(
                { error: 'Pickup and dropoff locations are required' },
                { status: 400 }
            );
        }

        if (!pickup_location.lat || !pickup_location.lng || !dropoff_location.lat || !dropoff_location.lng) {
            console.error('[DeliveriesAPI] Invalid location coordinates');
            return NextResponse.json(
                { error: 'Invalid location coordinates' },
                { status: 400 }
            );
        }

        // Generate 6-digit PIN for compartment unlock
        const pin = Math.floor(100000 + Math.random() * 900000).toString();
        console.log('[DeliveriesAPI] Generated PIN for delivery');

        // Create delivery
        const deliveryData = {
            user_id: user.id,
            status: 'pending',
            pin,
            pickup_lat: pickup_location.lat,
            pickup_lng: pickup_location.lng,
            pickup_address: pickup_location.address || '',
            dropoff_lat: dropoff_location.lat,
            dropoff_lng: dropoff_location.lng,
            dropoff_address: dropoff_location.address || '',
            package_description: package_description || '',
        };

        console.log('[DeliveriesAPI] Inserting delivery:', {
            userId: user.id,
            pickup: `${deliveryData.pickup_lat}, ${deliveryData.pickup_lng}`,
            dropoff: `${deliveryData.dropoff_lat}, ${deliveryData.dropoff_lng}`,
        });

        const { data, error } = await supabase
            .from('deliveries')
            .insert(deliveryData)
            .select()
            .single();

        if (error) {
            console.error('[DeliveriesAPI] Insert error:', error);
            return NextResponse.json({
                error: 'Failed to create delivery',
                details: error.message
            }, { status: 500 });
        }

        if (!data) {
            console.error('[DeliveriesAPI] No data returned from insert');
            return NextResponse.json({ error: 'Delivery creation failed' }, { status: 500 });
        }

        console.log('[DeliveriesAPI] Delivery created successfully:', data.id);
        return NextResponse.json(data, { status: 201 });
    } catch (error) {
        console.error('[DeliveriesAPI] Unexpected error:', error);
        return NextResponse.json({
            error: 'Internal server error',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
}

// GET /api/deliveries - List user's deliveries
export async function GET(request: NextRequest) {
    try {
        // Get authenticated user from cookies
        const { user } = await getAuthenticatedUser(request);

        if (!user) {
            console.error('[DeliveriesAPI] GET - User not authenticated');
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        console.log('[DeliveriesAPI] Fetching deliveries for user:', user.id);

        // Use REST API to ensure consistency with operator home
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (!supabaseUrl || !serviceKey) {
            // Fallback to JS client if env vars missing
            const supabase = createServerClient();
            const { data, error } = await supabase
                .from('deliveries')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false });

            if (error) {
                console.error('[DeliveriesAPI] Fetch error:', error);
                return NextResponse.json({ error: 'Failed to fetch deliveries' }, { status: 500 });
            }
            return NextResponse.json(data || []);
        }

        // Use REST API directly for consistency
        try {
            const restResponse = await fetch(
                `${supabaseUrl}/rest/v1/deliveries?select=*&user_id=eq.${user.id}&order=created_at.desc`,
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
                console.error('[DeliveriesAPI] REST API failed:', restResponse.status, errorText);
                throw new Error('REST API failed');
            }

            const data = await restResponse.json();
            console.log('[DeliveriesAPI] Fetched', data?.length || 0, 'deliveries for user via REST API');
            return NextResponse.json(data || []);
        } catch (restError) {
            console.error('[DeliveriesAPI] REST API error, falling back to JS client:', restError);
            // Fallback to JS client
            const supabase = createServerClient();
            const { data, error } = await supabase
                .from('deliveries')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false });

            if (error) {
                return NextResponse.json({ error: 'Failed to fetch deliveries' }, { status: 500 });
            }
            return NextResponse.json(data || []);
        }
    } catch (error) {
        console.error('[DeliveriesAPI] Unexpected error:', error);
        return NextResponse.json({
            error: 'Internal server error',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
}
