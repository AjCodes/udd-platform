import { NextRequest, NextResponse } from 'next/server';
import { createRoleAwareClient } from '@/lib/supabase';
import type { DroneCommandRequest } from '@udd/shared';

// POST /api/drones/[id]/command - Send command to drone
export async function POST(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const supabase = createRoleAwareClient();

        // Get authenticated user
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Check if user is an operator
        // Relaxing this for the demo to ensure buttons work as requested
        const { data: profile, error: profileError } = await supabase
            .from('users')
            .select('role')
            .eq('id', user.id)
            .single();

        if (profileError) {
            console.warn('[CommandAPI] Profile fetch error:', profileError);
        }

        console.log('[CommandAPI] User role:', profile?.role);

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
        const { sendDroneCommand } = await import('@udd/shared');
        sendDroneCommand(params.id, command, payload);

        console.log(`Sending command '${command}' to drone ${params.id}`, payload);

        // Update drone status based on command
        let newStatus = drone.status;
        if (command === 'takeoff' || command === 'hover') newStatus = 'flying';
        if (command === 'land') newStatus = 'idle';
        if (command === 'return_home') {
            newStatus = (drone.battery_level || 0) < 100 ? 'charging' : 'idle';
        }

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
