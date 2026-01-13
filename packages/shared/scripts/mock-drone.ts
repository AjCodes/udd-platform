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

const DRONE_ID = 'drone-alpha';

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

client.on('connect', () => {
    console.log('Connected to MQTT broker');
    console.log('Publishing to: drone/' + DRONE_ID + '/telemetry');
    console.log('Press Ctrl+C to stop\n');

    // Subscribe to commands
    const commandTopic = `drone/${DRONE_ID}/command`;
    client.subscribe(commandTopic, (err) => {
        if (!err) console.log('Listening for commands on:', commandTopic);
    });

    // Send telemetry every 2 seconds
    setInterval(() => {
        updatePosition();

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
            `Lat: ${telemetry.lat.toFixed(4)}, Lng: ${telemetry.lng.toFixed(4)} | ` +
            `Heading: ${telemetry.heading}° | Battery: ${telemetry.battery}% | Alt: ${telemetry.alt.toFixed(1)}m | Speed: ${telemetry.speed}m/s`
        );
    }, 2000);
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
