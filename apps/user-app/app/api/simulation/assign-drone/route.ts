
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

        // 1. Fetch all drones and active deliveries to find a truly available drone
        const { data: allDrones } = await supabase.from('drones').select('*');
        const { data: activeDeliveries } = await supabase
            .from('deliveries')
            .select('drone_id')
            .in('status', ['assigned', 'in_transit']);

        if (!allDrones) throw new Error('No drones found in fleet');

        const busyDroneIds = new Set(activeDeliveries?.map(d => d.drone_id) || []);

        // 2. Selection Logic
        let selectedDrone;

        // Priority 1: Drone-01 if idle/charging
        selectedDrone = allDrones.find(d =>
            d.name === 'Drone-01' && (d.status === 'idle' || d.status === 'charging')
        );

        // Priority 2: Any other idle/charging drone
        if (!selectedDrone) {
            selectedDrone = allDrones.find(d =>
                (d.status === 'idle' || d.status === 'charging') && !busyDroneIds.has(d.id)
            );
        }

        // Priority 3: Re-task a "stuck" flying drone (flying/returning but no active delivery)
        if (!selectedDrone) {
            selectedDrone = allDrones.find(d =>
                ['flying', 'returning'].includes(d.status) && !busyDroneIds.has(d.id)
            );
        }

        // Priority 4: Fallback to Drone-01 (Force it for simulation)
        if (!selectedDrone) {
            selectedDrone = allDrones.find(d => d.name === 'Drone-01');
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
