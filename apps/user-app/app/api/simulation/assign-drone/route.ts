
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

// Server-side Supabase client with Service Role Key for admin updates
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
    try {
        const { deliveryId } = await request.json();

        if (!deliveryId) {
            return NextResponse.json({ error: 'Delivery ID required' }, { status: 400 });
        }

        console.log(`[Simulation] finding drone for delivery: ${deliveryId}`);

        // 1. Find an idle drone (Prefer Drone-01 for simulation visibility)
        const { data: preferredDrone } = await supabase
            .from('drones')
            .select('*')
            .eq('name', 'Drone-01')
            .single();

        let selectedDrone;

        if (preferredDrone && preferredDrone.status === 'idle') {
            selectedDrone = preferredDrone;
        } else {
            // Fallback: Find any idle drone
            const { data: idleDrones } = await supabase
                .from('drones')
                .select('*')
                .eq('status', 'idle')
                .limit(1);

            if (idleDrones && idleDrones.length > 0) {
                selectedDrone = idleDrones[0];
            } else if (preferredDrone) {
                // Last resort: just use Drone-01 even if not idle (force it for demo)
                selectedDrone = preferredDrone;
            }
        }

        if (!selectedDrone) {
            return NextResponse.json({ error: 'No drones available in fleet' }, { status: 503 });
        }

        console.log(`[Simulation] Assigning drone ${selectedDrone.name} (${selectedDrone.id})`);

        // 2. Update Delivery: Assign drone and set status to 'assigned'
        const { error: deliveryError } = await supabase
            .from('deliveries')
            .update({
                drone_id: selectedDrone.id,
                status: 'assigned'
            })
            .eq('id', deliveryId);

        if (deliveryError) {
            throw deliveryError;
        }

        // 3. Update Drone: Set status to 'flying' (or 'returning' -> 'busy')
        // We set to 'flying' to show activity on home
        const { data: updatedDrone, error: droneUpdateError } = await supabase
            .from('drones')
            .update({ status: 'flying' })
            .eq('id', selectedDrone.id)
            .select()
            .single();

        if (droneUpdateError) {
            console.error('[Simulation] Drone update error:', droneUpdateError);
            throw droneUpdateError;
        }

        console.log(`[Simulation] Drone ${updatedDrone.name} status updated to: ${updatedDrone.status}`);

        return NextResponse.json({
            success: true,
            drone: updatedDrone.name,
            message: 'Drone assigned and status updated successfully'
        });

    } catch (err: unknown) {
        console.error('Simulation error:', err);
        const message = err instanceof Error ? err.message : 'Unknown error';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
