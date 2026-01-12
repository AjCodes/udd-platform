import mqtt, { MqttClient, IClientOptions } from 'mqtt';
import { MQTT_TOPICS } from './types';

let client: MqttClient | null = null;

export interface MqttConfig {
    brokerUrl: string;
    port: number;
    username: string;
    password: string;
}

// Get MQTT config from env
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
        protocol: 'mqtts',
        rejectUnauthorized: true,
    };

    const url = `mqtts://${mqttConfig.brokerUrl}`;
    client = mqtt.connect(url, options);

    client.on('connect', () => {
        console.log('[MQTT] Connected to broker');
    });

    client.on('error', (error) => {
        console.error('[MQTT] Connection error:', error);
    });

    client.on('disconnect', () => {
        console.log('[MQTT] Disconnected from broker');
    });

    return client;
}

// Get existing client
export function getMqttClient(): MqttClient | null {
    return client;
}

// Disconnect
export function disconnectMqtt(): void {
    if (client) {
        client.end();
        client = null;
    }
}

// Subscribe to telemetry
export function subscribeToTelemetry(
    droneId: string,
    callback: (data: TelemetryPayload) => void
): void {
    const mqttClient = getMqttClient() || connectMqtt();
    const topic = MQTT_TOPICS.telemetry(droneId);

    mqttClient.subscribe(topic, (err) => {
        if (err) {
            console.error('[MQTT] Subscribe failed:', topic, err);
            return;
        }
        console.log('[MQTT] Subscribed to', topic);
    });

    mqttClient.on('message', (receivedTopic, message) => {
        if (receivedTopic === topic) {
            try {
                const data = JSON.parse(message.toString()) as TelemetryPayload;
                callback(data);
            } catch (error) {
                console.error('[MQTT] Failed to parse message:', error);
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
            console.error('[MQTT] Publish failed:', topic, err);
            return;
        }
        console.log('[MQTT] Sent command:', command);
    });
}

// Telemetry payload structure
export interface TelemetryPayload {
    lat: number;
    lng: number;
    alt: number;
    battery: number;
    speed: number;
    ts: number;
}

export { MQTT_TOPICS };
