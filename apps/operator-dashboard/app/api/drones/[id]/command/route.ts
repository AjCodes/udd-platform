import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@shared/supabase';
import type { DroneCommandRequest } from '@shared/types';

// POST /api/drones/[id]/command - Send command to drone
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

        // Parse command from request body
        const body: DroneCommandRequest = await request.json();
        const { command, payload } = body;

        // Validate command
        const validCommands = ['takeoff', 'land', 'move', 'return_home', 'hover', 'unlock'];
        if (!validCommands.includes(command)) {
            return NextResponse.json(
                { error: `Invalid command. Valid commands: ${validCommands.join(', ')}` },
                { status: 400 }
            );
        }

        // Check if drone exists
        const { data: drone, error: droneError } = await supabase
            .from('drones')
            .select('*')
            .eq('id', params.id)
            .single();

        if (droneError || !drone) {
            return NextResponse.json({ error: 'Drone not found' }, { status: 404 });
        }

        // Send command to drone via MQTT
        const { sendDroneCommand } = await import('@shared/mqtt');
        sendDroneCommand(params.id, command, payload);

        console.log(`Sending command '${command}' to drone ${params.id}`, payload);

        // Update drone status based on command
        let newStatus = drone.status;
        if (command === 'takeoff') newStatus = 'flying';
        if (command === 'land') newStatus = 'idle';
        if (command === 'return_home') newStatus = 'returning';

        if (newStatus !== drone.status) {
            await supabase
                .from('drones')
                .update({ status: newStatus })
                .eq('id', params.id);
        }

        return NextResponse.json({
            success: true,
            message: `Command '${command}' sent to drone ${drone.name}`,
            drone_id: params.id,
            command,
            payload,
        });
    } catch (error) {
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
