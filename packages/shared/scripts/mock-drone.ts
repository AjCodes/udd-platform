/**
 * Mock Drone Simulator
 * 
 * Run this script to simulate a drone sending telemetry to HiveMQ.
 * This is useful for testing the dashboard without the actual hardware.
 * 
 * Usage: npx ts-node scripts/mock-drone.ts
 */

import mqtt from 'mqtt';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from root .env
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const DRONE_ID = 'drone-alpha'; // Match this to your drone ID in Supabase

// MQTT config from environment
const config = {
    brokerUrl: process.env.MQTT_BROKER_URL || '',
    port: parseInt(process.env.MQTT_PORT || '8883', 10),
    username: process.env.MQTT_USERNAME || '',
    password: process.env.MQTT_PASSWORD || '',
};

if (!config.brokerUrl) {
    console.error('❌ MQTT_BROKER_URL not set in .env');
    process.exit(1);
}

// Connect to MQTT
const url = `mqtts://${config.brokerUrl}`;
console.log(`🔌 Connecting to ${url}...`);

const client = mqtt.connect(url, {
    port: config.port,
    username: config.username,
    password: config.password,
    protocol: 'mqtts',
});

// Simulated drone state
let droneState = {
    lat: 51.4416,  // Eindhoven coordinates
    lng: 5.4697,
    alt: 0,
    battery: 100,
    speed: 0,
    heading: 0,
};

// Simulate movement
function updatePosition() {
    // Random small movement
    droneState.lat += (Math.random() - 0.5) * 0.0001;
    droneState.lng += (Math.random() - 0.5) * 0.0001;

    // Simulate altitude changes
    if (droneState.alt < 50) {
        droneState.alt += Math.random() * 2;
    }

    // Drain battery slowly
    droneState.battery = Math.max(0, droneState.battery - 0.01);

    // Update speed based on movement
    droneState.speed = Math.random() * 5 + 2; // 2-7 m/s

    // Update heading
    droneState.heading = (droneState.heading + Math.random() * 10) % 360;
}

client.on('connect', () => {
    console.log('✅ Connected to MQTT broker');
    console.log(`📡 Publishing telemetry to: drone/${DRONE_ID}/telemetry`);
    console.log('Press Ctrl+C to stop\n');

    // Subscribe to commands
    const commandTopic = `drone/${DRONE_ID}/command`;
    client.subscribe(commandTopic, (err) => {
        if (!err) {
            console.log(`🎮 Listening for commands on: ${commandTopic}\n`);
        }
    });

    // Publish telemetry every 2 seconds
    setInterval(() => {
        updatePosition();

        const telemetry = {
            lat: droneState.lat,
            lng: droneState.lng,
            alt: droneState.alt,
            battery: Math.round(droneState.battery),
            speed: parseFloat(droneState.speed.toFixed(2)),
            ts: Date.now(),
        };

        const topic = `drone/${DRONE_ID}/telemetry`;
        client.publish(topic, JSON.stringify(telemetry), { qos: 0 });

        // Log telemetry
        console.log(
            `📍 Lat: ${telemetry.lat.toFixed(4)}, Lng: ${telemetry.lng.toFixed(4)} | ` +
            `🔋 ${telemetry.battery}% | ` +
            `📏 Alt: ${telemetry.alt.toFixed(1)}m | ` +
            `🚀 Speed: ${telemetry.speed}m/s`
        );
    }, 2000);
});

// Handle incoming commands
client.on('message', (topic, message) => {
    console.log(`\n🎮 Received command: ${message.toString()}`);

    try {
        const cmd = JSON.parse(message.toString());

        switch (cmd.cmd) {
            case 'takeoff':
                console.log('🛫 Takeoff command received - climbing...');
                droneState.alt = 10;
                break;
            case 'land':
                console.log('🛬 Land command received - descending...');
                droneState.alt = 0;
                droneState.speed = 0;
                break;
            case 'return_home':
                console.log('🏠 Return home command received');
                droneState.lat = 51.4416;
                droneState.lng = 5.4697;
                break;
            case 'unlock':
                console.log('🔓 Unlock storage compartment');
                break;
            default:
                console.log(`Unknown command: ${cmd.cmd}`);
        }
    } catch (error) {
        console.error('Failed to parse command:', error);
    }
});

client.on('error', (error) => {
    console.error('❌ MQTT Error:', error);
});

// Handle graceful shutdown
process.on('SIGINT', () => {
    console.log('\n\n👋 Shutting down mock drone...');
    client.end();
    process.exit(0);
});
