import { NextRequest } from 'next/server';
import { createServerClient } from '@udd/shared';

// GET /api/drones/[id]/telemetry - Stream live telemetry data (SSE)
export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    const supabase = createServerClient();

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
        return new Response('Unauthorized', { status: 401 });
    }

    // Check if user is an operator
    const { data: profile, error: profileError } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single();

    if (profileError || profile?.role !== 'operator') {
        return new Response('Forbidden - operators only', { status: 403 });
    }

    // Check if drone exists
    const { data: drone, error: droneError } = await supabase
        .from('drones')
        .select('*')
        .eq('id', params.id)
        .single();

    if (droneError || !drone) {
        return new Response('Drone not found', { status: 404 });
    }

    // Set up Server-Sent Events (SSE) stream
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
        async start(controller) {
            // Send initial drone data
            const initialData = {
                drone_id: drone.id,
                name: drone.name,
                status: drone.status,
                battery_level: drone.battery_level,
                latitude: drone.current_lat,
                longitude: drone.current_lng,
                altitude: 0,
                speed: 0,
                timestamp: new Date().toISOString(),
            };

            controller.enqueue(
                encoder.encode(`data: ${JSON.stringify(initialData)}\n\n`)
            );

            // TODO: Subscribe to MQTT topic and forward telemetry
            // For now, we'll poll the database every 2 seconds
            const interval = setInterval(async () => {
                try {
                    // Get latest telemetry
                    const { data: telemetry } = await supabase
                        .from('telemetry')
                        .select('*')
                        .eq('drone_id', params.id)
                        .order('timestamp', { ascending: false })
                        .limit(1)
                        .single();

                    // Get current drone status
                    const { data: currentDrone } = await supabase
                        .from('drones')
                        .select('status, battery_level')
                        .eq('id', params.id)
                        .single();

                    const payload = telemetry || {
                        drone_id: params.id,
                        latitude: drone.current_lat,
                        longitude: drone.current_lng,
                        altitude: 0,
                        battery_level: currentDrone?.battery_level || drone.battery_level,
                        speed: 0,
                        timestamp: new Date().toISOString(),
                    };

                    controller.enqueue(
                        encoder.encode(`data: ${JSON.stringify({ ...payload, status: currentDrone?.status })}\n\n`)
                    );
                } catch (error) {
                    console.error('Telemetry stream error:', error);
                }
            }, 2000);

            // Clean up on connection close
            request.signal.addEventListener('abort', () => {
                clearInterval(interval);
                controller.close();
            });
        },
    });

    return new Response(stream, {
        headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
        },
    });
}
