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
import { createServerClient } from '../src/supabase.ts';

// ES module compatible __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env from root
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const DRONE_ID = 'drone-01';

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

async function resetFleet() {
    console.log('🔄 Checking System State...');
    try {
        const supabase = createServerClient();

        // Check if we already have drones
        const { count } = await supabase.from('drones').select('*', { count: 'exact', head: true });

        if (count && count > 0) {
            console.log(`  ✅ Database already has ${count} drones. Skipping reset.`);
            return;
        }

        console.log('  ⚠️ SEEDING DATABASE WITH FRESH DRONES');

        const drones = [];
        // Drone 1 is 01
        drones.push({
            name: 'Drone-01',
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

    const supabase = createServerClient();

    // Send telemetry for ALL drones every 1 second
    setInterval(async () => {
        try {

            // 1. Fetch all drones
            const { data: drones, error: dronesError } = await supabase
                .from('drones')
                .select('*')
                .order('name', { ascending: true });

            if (dronesError || !drones) return;

            // 2. Fetch all active deliveries
            const { data: activeDeliveries } = await supabase
                .from('deliveries')
                .select('*')
                .in('status', ['assigned', 'in_transit']);

            // 3. Process each drone
            for (const drone of drones) {
                let targetLat = drone.current_lat;
                let targetLng = drone.current_lng;
                let missionPhase = 'idle';
                let activeDeliveryId = null;

                // Find if this drone has an active delivery
                const activeDelivery = activeDeliveries?.find(d => d.drone_id === drone.id);

                if (activeDelivery) {
                    activeDeliveryId = activeDelivery.id;
                    if (activeDelivery.status === 'assigned') {
                        targetLat = activeDelivery.pickup_lat;
                        targetLng = activeDelivery.pickup_lng;
                        missionPhase = 'pickup';
                    } else if (activeDelivery.status === 'in_transit') {
                        targetLat = activeDelivery.dropoff_lat;
                        targetLng = activeDelivery.dropoff_lng;
                        missionPhase = 'dropoff';
                    }
                }

                // Physics update
                let newLat = drone.current_lat || 51.4416;
                let newLng = drone.current_lng || 5.4697;
                let newHeading = drone.heading || 0;
                let newBattery = Math.max(0, (drone.battery_level || 100) - 0.0025);
                let speed = 0;

                if (missionPhase !== 'idle') {
                    const speedFactor = 0.0001;
                    const dLat = targetLat - newLat;
                    const dLng = targetLng - newLng;
                    const dist = Math.sqrt(dLat * dLat + dLng * dLng);

                    if (dist > 0.0001) {
                        newLat += (dLat / dist) * speedFactor;
                        newLng += (dLng / dist) * speedFactor;
                        speed = 15;
                        newHeading = (Math.atan2(dLng, dLat) * 180 / Math.PI + 360) % 360;
                    } else {
                        // Arrived
                        if (missionPhase === 'pickup') {
                            await supabase.from('deliveries').update({ status: 'in_transit' }).eq('id', activeDeliveryId);
                        } else if (missionPhase === 'dropoff') {
                            await supabase.from('deliveries').update({ status: 'delivered' }).eq('id', activeDeliveryId);
                            missionPhase = 'idle';
                        }
                    }
                } else {
                    // Idle jitter
                    newLat += (Math.random() - 0.5) * 0.00005;
                    newLng += (Math.random() - 0.5) * 0.00005;
                    newHeading = (newHeading + (Math.random() - 0.3) * 5) % 360;
                }

                // Update DB (Debounced: only every few ticks or just do it for active ones)
                // For simplicity in this demo, we update all flying ones every tick
                if (missionPhase !== 'idle' || Math.random() > 0.9) {
                    await supabase.from('drones').update({
                        current_lat: newLat,
                        current_lng: newLng,
                        heading: newHeading,
                        status: missionPhase === 'idle' ? 'idle' : 'flying',
                        battery_level: newBattery
                    }).eq('id', drone.id);
                }

                // Publish telemetry for Drone-01 (or all if needed, but keep it light)
                if (drone.name === 'Drone-01') {
                    const telemetry = {
                        lat: newLat,
                        lng: newLng,
                        alt: missionPhase === 'idle' ? 0 : 60,
                        heading: Math.round(newHeading),
                        battery: Math.round(newBattery),
                        speed: parseFloat(speed.toFixed(2)),
                        ts: Date.now(),
                    };
                    client.publish(`drone/${drone.id}/telemetry`, JSON.stringify(telemetry), { qos: 0 });
                    if (missionPhase !== 'idle') {
                        console.log(`[Simulation] ${drone.name} | Phase: ${missionPhase} | Lat: ${newLat.toFixed(5)}, Lng: ${newLng.toFixed(5)}`);
                    }
                }
            }
        } catch (e) {
            console.error('[Simulation] Loop error:', e);
        }
    }, 1000);
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
