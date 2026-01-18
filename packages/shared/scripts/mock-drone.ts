/**
 * Mock Drone Simulator
 * 
 * Simulates a drone sending telemetry to HiveMQ for testing.
 * Run with: npx ts-node scripts/mock-drone.ts
 */

import mqtt from 'mqtt';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// ES module compatible __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env from root
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const DRONE_ID = 'drone-001';

const config = {
    brokerUrl: process.env.MQTT_BROKER_URL || '',
    port: parseInt(process.env.MQTT_PORT || '8883', 10),
    username: process.env.MQTT_USERNAME || '',
    password: process.env.MQTT_PASSWORD || '',
};

if (!config.brokerUrl) {
    console.error('MQTT_BROKER_URL not set in .env');
    process.exit(1);
}

const url = `mqtts://${config.brokerUrl}`;
console.log('Connecting to', url);

const client = mqtt.connect(url, {
    port: config.port,
    username: config.username,
    password: config.password,
    protocol: 'mqtts',
});

// Simulated drone state
let droneState = {
    lat: 51.4416,
    lng: 5.4697,
    alt: 0,
    heading: 0,
    battery: 100,
    speed: 0,
};

import { createClient } from '@supabase/supabase-js';

async function resetFleet() {
    console.log('🔄 Performing System Reset...');
    try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (!supabaseUrl || !supabaseKey) {
            console.error('❌ Missing Supabase Env Variables!');
            return;
        }

        const supabase = createClient(supabaseUrl, supabaseKey);

        console.log('  ⚠️ FORCE RESETTING DATABASE TO CLEAN STATE');

        // 1. Delete ALL deliveries
        await supabase.from('deliveries').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        // 2. Delete ALL telemetry
        await supabase.from('telemetry').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        // 3. Delete ALL drones
        await supabase.from('drones').delete().neq('id', '00000000-0000-0000-0000-000000000000');

        console.log('  ✅ Database cleared. Reseeding 20 fresh drones...');

        const drones = [];
        // Drone 1 is 001
        drones.push({
            name: 'Drone-001',
            status: 'idle',
            battery_level: 100,
            current_lat: 51.4416,
            current_lng: 5.4697,
        });

        // Drones 2-20
        for (let i = 2; i <= 20; i++) {
            const num = i.toString().padStart(2, '0');
            drones.push({
                name: `Drone-${num}`,
                status: 'idle',
                battery_level: 100,
                current_lat: 51.4416 + (Math.random() - 0.5) * 0.005,
                current_lng: 5.4697 + (Math.random() - 0.5) * 0.005,
            });
        }

        const { error } = await supabase.from('drones').insert(drones);
        if (error) console.error('  ❌ Error seeding drones:', error.message);
        else console.log('  ✅ 20 Drones seeded successfully.');

    } catch (err) {
        console.error('❌ Failed to reset fleet:', err);
    }
}

function updatePosition() {
    droneState.lat += (Math.random() - 0.5) * 0.0001;
    droneState.lng += (Math.random() - 0.5) * 0.0001;

    if (droneState.alt < 50) {
        droneState.alt += Math.random() * 2;
    }

    // Update heading (0-360 degrees, slowly rotating)
    droneState.heading = (droneState.heading + (Math.random() - 0.3) * 10) % 360;
    if (droneState.heading < 0) droneState.heading += 360;

    droneState.battery = Math.max(0, droneState.battery - 0.01);
    droneState.speed = Math.random() * 5 + 2;
}

client.on('connect', async () => {
    console.log('Connected to MQTT broker');

    // Reset DB on startup
    await resetFleet();

    console.log('Publishing to: drone/' + DRONE_ID + '/telemetry');
    console.log('Press Ctrl+C to stop\n');

    // Subscribe to commands
    const commandTopic = `drone/${DRONE_ID}/command`;
    client.subscribe(commandTopic, (err) => {
        if (!err) console.log('Listening for commands on:', commandTopic);
    });

    // Send telemetry every 1 second
    setInterval(async () => {
        // --- 1. GAME LOOP: Determine Target & Move ---
        let targetLat = droneState.lat;
        let targetLng = droneState.lng;
        let missionPhase = 'idle';
        let activeDeliveryId = null;

        try {
            const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
            const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

            if (supabaseUrl && supabaseKey) {
                const supabase = createClient(supabaseUrl, supabaseKey);

                // 0. Get Drone ID for 'Drone-001'
                const { data: droneData } = await supabase
                    .from('drones')
                    .select('id')
                    .eq('name', 'Drone-001')
                    .single();

                if (droneData) {
                    // Find active mission SPECIFICALLY for this drone
                    const { data: activeDelivery } = await supabase
                        .from('deliveries')
                        .select('*')
                        .eq('drone_id', droneData.id)
                        .in('status', ['assigned', 'in_transit'])
                        .limit(1)
                        .single();

                    if (activeDelivery) {
                        activeDeliveryId = activeDelivery.id;
                        if (activeDelivery.status === 'assigned') {
                            // Phase 1: Fly to Pickup
                            targetLat = activeDelivery.pickup_lat;
                            targetLng = activeDelivery.pickup_lng;
                            missionPhase = 'pickup';
                        } else if (activeDelivery.status === 'in_transit') {
                            // Phase 2: Fly to Dropoff
                            targetLat = activeDelivery.dropoff_lat;
                            targetLng = activeDelivery.dropoff_lng;
                            missionPhase = 'dropoff';
                        }
                    }
                }

                // --- 2. Move Drone Towards Target ---
                if (missionPhase !== 'idle') {
                    const speedFactor = 0.0001; // Adjusted for 500ms interval (smoother)
                    const dLat = targetLat - droneState.lat;
                    const dLng = targetLng - droneState.lng;
                    const dist = Math.sqrt(dLat * dLat + dLng * dLng);

                    if (dist > 0.0001) { // Threshold
                        droneState.lat += (dLat / dist) * speedFactor;
                        droneState.lng += (dLng / dist) * speedFactor;
                        droneState.speed = 15; // 15 m/s

                        // Calculate Heading
                        droneState.heading = (Math.atan2(dLng, dLat) * 180 / Math.PI + 360) % 360;
                    } else {
                        // Arrived at waypoint
                        droneState.speed = 0;

                        // Handle State Transitions
                        if (missionPhase === 'pickup') {
                            console.log(`[Simulation] Arrived at Pickup. Updating delivery ${activeDeliveryId} -> in_transit`);
                            await supabase
                                .from('deliveries')
                                .update({ status: 'in_transit' })
                                .eq('id', activeDeliveryId);
                        } else if (missionPhase === 'dropoff') {
                            console.log(`[Simulation] Arrived at Dropoff. Updating delivery ${activeDeliveryId} -> delivered`);
                            await supabase
                                .from('deliveries')
                                .update({ status: 'delivered' })
                                .eq('id', activeDeliveryId);
                            // Also set drone to idle
                            await supabase
                                .from('drones')
                                .update({ status: 'idle' })
                                .eq('name', 'Drone-001');
                        }
                    }
                    droneState.alt = 60; // Cruise altitude
                } else {
                    updatePosition(); // Random idle movement
                }

                // Sync drone state to DB
                await supabase
                    .from('drones')
                    .update({
                        current_lat: droneState.lat,
                        current_lng: droneState.lng,
                        heading: droneState.heading,
                        status: missionPhase === 'idle' ? 'idle' : 'flying'
                    })
                    .eq('name', 'Drone-001');
            }
        } catch (e) {
            // Squelch errors
        }

        // Battery drain
        droneState.battery = Math.max(0, droneState.battery - 0.0025);

        // --- 3. Publish Telemetry ---
        const telemetry = {
            lat: droneState.lat,
            lng: droneState.lng,
            alt: droneState.alt,
            heading: Math.round(droneState.heading),
            battery: Math.round(droneState.battery),
            speed: parseFloat(droneState.speed.toFixed(2)),
            ts: Date.now(),
        };

        client.publish(`drone/${DRONE_ID}/telemetry`, JSON.stringify(telemetry), { qos: 0 });

        console.log(
            `Phase: ${missionPhase} | Lat: ${telemetry.lat.toFixed(5)}, Lng: ${telemetry.lng.toFixed(5)} | ` +
            `Hdg: ${telemetry.heading}° | Bat: ${telemetry.battery}%`
        );
    }, 500);
});

// Handle commands
client.on('message', (topic, message) => {
    console.log('\nReceived command:', message.toString());

    try {
        const cmd = JSON.parse(message.toString());

        switch (cmd.cmd) {
            case 'takeoff':
                console.log('Takeoff - climbing...');
                droneState.alt = 10;
                break;
            case 'land':
                console.log('Landing...');
                droneState.alt = 0;
                droneState.speed = 0;
                break;
            case 'return_home':
                console.log('Returning home...');
                droneState.lat = 51.4416;
                droneState.lng = 5.4697;
                break;
            case 'unlock':
                console.log('Unlocking storage');
                break;
            default:
                console.log('Unknown command:', cmd.cmd);
        }
    } catch (error) {
        console.error('Failed to parse command:', error);
    }
});

client.on('error', (error) => {
    console.error('MQTT Error:', error);
});

process.on('SIGINT', () => {
    console.log('\nShutting down...');
    client.end();
    process.exit(0);
});
