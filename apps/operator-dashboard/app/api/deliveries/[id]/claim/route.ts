import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@shared/supabase';

// POST /api/deliveries/[id]/claim - Operator claims a delivery
export async function POST(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const supabase = createServerClient();

        // Get authenticated user
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Check if user is an operator
        const { data: profile, error: profileError } = await supabase
            .from('users')
            .select('role')
            .eq('id', user.id)
            .single();

        if (profileError || profile?.role !== 'operator') {
            return NextResponse.json({ error: 'Forbidden - operators only' }, { status: 403 });
        }

        // Check if delivery exists and is pending
        const { data: delivery, error: fetchError } = await supabase
            .from('deliveries')
            .select('*')
            .eq('id', params.id)
            .eq('status', 'pending')
            .single();

        if (fetchError || !delivery) {
            return NextResponse.json(
                { error: 'Delivery not found or already claimed' },
                { status: 404 }
            );
        }

        // Get an available drone
        const { data: drone, error: droneError } = await supabase
            .from('drones')
            .select('id')
            .eq('status', 'idle')
            .limit(1)
            .single();

        if (droneError || !drone) {
            return NextResponse.json(
                { error: 'No available drones' },
                { status: 400 }
            );
        }

        // Claim the delivery
        const { data, error } = await supabase
            .from('deliveries')
            .update({
                operator_id: user.id,
                drone_id: drone.id,
                status: 'assigned',
                updated_at: new Date().toISOString(),
            })
            .eq('id', params.id)
            .select()
            .single();

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        // Update drone status to flying
        await supabase
            .from('drones')
            .update({ status: 'flying' })
            .eq('id', drone.id);

        return NextResponse.json(data);
    } catch (error) {
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
