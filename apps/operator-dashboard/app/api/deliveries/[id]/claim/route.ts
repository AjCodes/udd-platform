import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@udd/shared';

// POST /api/deliveries/[id]/claim - Claim a delivery and assign a drone
// No auth required for dashboard demo
export async function POST(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const supabase = createServerClient();

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

        // Get an available drone (Prefer Drone-01 for simulation visibility)
        const { data: preferredDrone } = await supabase
            .from('drones')
            .select('id, name')
            .eq('name', 'Drone-01')
            .single();

        let drone;

        // Check if preferred drone is truly idle
        const { data: droneStatusData } = await supabase
            .from('drones')
            .select('status')
            .eq('id', preferredDrone?.id)
            .single();

        if (preferredDrone && droneStatusData?.status === 'idle') {
            drone = preferredDrone;
        } else {
            // Fallback: Get any idle drone
            const { data: idleDrone, error: droneError } = await supabase
                .from('drones')
                .select('id, name')
                .eq('status', 'idle')
                .limit(1)
                .single();

            drone = idleDrone;

            if (droneError || !drone) {
                // Last resort: force assign Drone-01 if it exists
                drone = preferredDrone;
            }
        }

        if (!drone) {
            return NextResponse.json(
                { error: 'No available drones' },
                { status: 400 }
            );
        }

        // Claim the delivery
        const { data, error } = await supabase
            .from('deliveries')
            .update({
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
        const { data: updatedDrone, error: droneUpdateError } = await supabase
            .from('drones')
            .update({ status: 'flying' })
            .eq('id', drone.id)
            .select()
            .single();

        if (droneUpdateError) {
            console.error('[Claim] Failed to update drone status:', droneUpdateError);
        } else {
            console.log('[Claim] Drone', updatedDrone.name, 'status updated to:', updatedDrone.status);
        }

        console.log('[Claim] ✅ Delivery', params.id.slice(0, 8), 'assigned to drone', drone.name);
        console.log('[Claim] Delivery status:', data.status, 'Drone ID:', drone.id);

        return NextResponse.json(data);
    } catch (error) {
        console.error('Failed to claim delivery:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

