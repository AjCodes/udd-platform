
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

        // 1. Find an idle drone (or just pick the first one if none idle, to force it)
        const { data: drones, error: _droneError } = await supabase
            .from('drones')
            .select('*')
            .eq('status', 'idle')
            .limit(1);

        let selectedDrone;

        if (drones && drones.length > 0) {
            selectedDrone = drones[0];
        } else {
            // Fallback: Pick ANY drone if none are idle (force assignment for demo)
            const { data: allDrones } = await supabase
                .from('drones')
                .select('*')
                .limit(1);

            if (allDrones && allDrones.length > 0) {
                selectedDrone = allDrones[0];
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
        // We set to 'flying' to show activity on dashboard
        await supabase
            .from('drones')
            .update({ status: 'flying' })
            .eq('id', selectedDrone.id);

        return NextResponse.json({
            success: true,
            drone: selectedDrone.name,
            message: 'Drone assigned successfully'
        });

    } catch (err: unknown) {
        console.error('Simulation error:', err);
        const message = err instanceof Error ? err.message : 'Unknown error';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
