import mqtt, { MqttClient, IClientOptions } from 'mqtt';
import { MQTT_TOPICS } from './types';

let client: MqttClient | null = null;

export interface MqttConfig {
    brokerUrl: string;
    port: number;
    username: string;
    password: string;
}

// Get MQTT config from environment variables
export function getMqttConfig(): MqttConfig {
    return {
        brokerUrl: process.env.MQTT_BROKER_URL || '',
        port: parseInt(process.env.MQTT_PORT || '8883', 10),
        username: process.env.MQTT_USERNAME || '',
        password: process.env.MQTT_PASSWORD || '',
    };
}

// Connect to MQTT broker
export function connectMqtt(config?: MqttConfig): MqttClient {
    if (client && client.connected) {
        return client;
    }

    const mqttConfig = config || getMqttConfig();

    const options: IClientOptions = {
        port: mqttConfig.port,
        username: mqttConfig.username,
        password: mqttConfig.password,
        protocol: 'mqtts', // TLS
        rejectUnauthorized: true,
    };

    const url = `mqtts://${mqttConfig.brokerUrl}`;
    client = mqtt.connect(url, options);

    client.on('connect', () => {
        console.log('✅ Connected to MQTT broker');
    });

    client.on('error', (error) => {
        console.error('❌ MQTT connection error:', error);
    });

    client.on('disconnect', () => {
        console.log('⚠️ Disconnected from MQTT broker');
    });

    return client;
}

// Get existing MQTT client
export function getMqttClient(): MqttClient | null {
    return client;
}

// Disconnect from MQTT broker
export function disconnectMqtt(): void {
    if (client) {
        client.end();
        client = null;
    }
}

// Subscribe to drone telemetry
export function subscribeToTelemetry(
    droneId: string,
    callback: (data: TelemetryPayload) => void
): void {
    const mqttClient = getMqttClient() || connectMqtt();
    const topic = MQTT_TOPICS.telemetry(droneId);

    mqttClient.subscribe(topic, (err) => {
        if (err) {
            console.error(`Failed to subscribe to ${topic}:`, err);
            return;
        }
        console.log(`📡 Subscribed to ${topic}`);
    });

    mqttClient.on('message', (receivedTopic, message) => {
        if (receivedTopic === topic) {
            try {
                const data = JSON.parse(message.toString()) as TelemetryPayload;
                callback(data);
            } catch (error) {
                console.error('Failed to parse telemetry message:', error);
            }
        }
    });
}

// Send command to drone
export function sendDroneCommand(
    droneId: string,
    command: string,
    payload?: Record<string, unknown>
): void {
    const mqttClient = getMqttClient() || connectMqtt();
    const topic = MQTT_TOPICS.command(droneId);

    const message = JSON.stringify({ cmd: command, payload, ts: Date.now() });

    mqttClient.publish(topic, message, { qos: 1 }, (err) => {
        if (err) {
            console.error(`Failed to send command to ${topic}:`, err);
            return;
        }
        console.log(`🚀 Sent command '${command}' to ${topic}`);
    });
}

// Telemetry data structure from drone
export interface TelemetryPayload {
    lat: number;
    lng: number;
    alt: number;
    battery: number;
    speed: number;
    ts: number;
}

// Export topics helper
export { MQTT_TOPICS };
