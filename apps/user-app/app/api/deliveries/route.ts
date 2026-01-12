import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@shared/supabase';
import type { CreateDeliveryRequest } from '@shared/types';

// POST /api/deliveries - Create a new delivery request
export async function POST(request: NextRequest) {
    try {
        const supabase = createServerClient();

        // Get authenticated user
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Parse request body
        const body: CreateDeliveryRequest = await request.json();
        const { pickup_location, dropoff_location, package_description } = body;

        // Validate required fields
        if (!pickup_location || !dropoff_location) {
            return NextResponse.json(
                { error: 'Pickup and dropoff locations are required' },
                { status: 400 }
            );
        }

        // Create delivery
        const { data, error } = await supabase
            .from('deliveries')
            .insert({
                user_id: user.id,
                status: 'pending',
                pickup_lat: pickup_location.lat,
                pickup_lng: pickup_location.lng,
                pickup_address: pickup_location.address,
                dropoff_lat: dropoff_location.lat,
                dropoff_lng: dropoff_location.lng,
                dropoff_address: dropoff_location.address,
                package_description,
            })
            .select()
            .single();

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json(data, { status: 201 });
    } catch (error) {
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// GET /api/deliveries - List user's deliveries
export async function GET(request: NextRequest) {
    try {
        const supabase = createServerClient();

        // Get authenticated user
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Fetch user's deliveries
        const { data, error } = await supabase
            .from('deliveries')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json(data);
    } catch (error) {
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
