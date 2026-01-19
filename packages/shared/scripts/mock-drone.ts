/**
 * Mock Drone Simulator
 * 
 * Simulates 20 drones sending telemetry to HiveMQ for testing.
 * Runs an autonomous loop that handles active deliveries and responds to manual commands.
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

// Cache for altitude and other simulated-only state
const droneExtraState: Record<string, { alt: number; targetLat?: number; targetLng?: number }> = {};

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
        for (let i = 1; i <= 20; i++) {
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

client.on('connect', async () => {
    console.log('Connected to MQTT broker');

    // Reset DB on startup
    await resetFleet();

    // Subscribe to ALL drone command topics
    client.subscribe('drone/+/command', (err) => {
        if (!err) console.log('Listening for commands on: drone/+/command');
    });

    const supabase = createServerClient();
    const HOME_LAT = 51.4416;
    const HOME_LNG = 5.4697;

    // Simulation loop
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
                if (!droneExtraState[drone.id]) {
                    droneExtraState[drone.id] = { alt: drone.status === 'idle' ? 0 : 60 };
                }

                const state = droneExtraState[drone.id];
                let targetLat = drone.current_lat;
                let targetLng = drone.current_lng;
                let missionPhase = 'idle';
                let activeDeliveryId = null;

                // Priority 1: Manual Commands (Returning)
                if (drone.status === 'returning') {
                    targetLat = HOME_LAT;
                    targetLng = HOME_LNG;
                    missionPhase = 'returning';
                }
                // Priority 2: Active Deliveries
                else {
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
                    } else if (drone.status === 'flying') {
                        // Flying but no delivery? Just hover or go back home automatically
                        missionPhase = 'hover';
                    }
                }

                // Physics update
                let newLat = drone.current_lat || HOME_LAT;
                let newLng = drone.current_lng || HOME_LNG;
                let newHeading = drone.heading || 0;
                let newBattery = Math.max(0, (drone.battery_level || 100) - 0.0025);
                let speed = 0;

                // Altitude control
                if (drone.status === 'idle') {
                    state.alt = Math.max(0, state.alt - 5);
                } else {
                    state.alt = Math.min(60, state.alt + 2);
                }

                if (missionPhase !== 'idle' && missionPhase !== 'hover' && state.alt > 10) {
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
                        } else if (missionPhase === 'returning') {
                            await supabase.from('drones').update({ status: 'idle' }).eq('id', drone.id);
                        }
                    }
                } else if (missionPhase === 'idle' || missionPhase === 'hover') {
                    // Jitter
                    newLat += (Math.random() - 0.5) * 0.00002;
                    newLng += (Math.random() - 0.5) * 0.00002;
                    newHeading = (newHeading + (Math.random() - 0.5) * 2) % 360;
                }

                // Update DB (Every few seconds for idle, every tick for flying)
                if (drone.status !== 'idle' || Math.random() > 0.9) {
                    await supabase.from('drones').update({
                        current_lat: newLat,
                        current_lng: newLng,
                        heading: newHeading,
                        battery_level: newBattery
                    }).eq('id', drone.id);
                }

                // Publish telemetry
                const telemetry = {
                    lat: newLat,
                    lng: newLng,
                    alt: state.alt,
                    heading: Math.round(newHeading),
                    battery: Math.round(newBattery),
                    speed: parseFloat(speed.toFixed(2)),
                    status: drone.status,
                    ts: Date.now(),
                };
                client.publish(`drone/${drone.id}/telemetry`, JSON.stringify(telemetry), { qos: 0 });
            }
        } catch (e) {
            console.error('[Simulation] Loop error:', e);
        }
    }, 1000);
});

// Handle commands
client.on('message', async (topic, message) => {
    const parts = topic.split('/');
    const droneId = parts[1];

    console.log(`\n[MQTT] Command for ${droneId}:`, message.toString());

    try {
        const cmd = JSON.parse(message.toString());
        const supabase = createServerClient();

        // Unlock is a special case (maybe just log it)
        if (cmd.cmd === 'unlock') {
            console.log(`[Simulation] ${droneId} storage UNLOCKED!`);
            return;
        }

        // For other commands like takeoff, land, return_home - the API already updates the DB.
        // We just log it here for confirmation.
        console.log(`[Simulation] ${droneId} executing: ${cmd.cmd}`);

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
