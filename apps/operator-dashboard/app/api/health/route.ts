import { NextResponse } from 'next/server';
import { testSupabaseConnection } from '@shared/supabase';
import { getMqttConfig } from '@shared/mqtt';

// Health check endpoint
export async function GET() {
    const health: Record<string, unknown> = {
        status: 'ok',
        timestamp: new Date().toISOString(),
        checks: {},
    };

    // Check Supabase
    try {
        const supabaseOk = await testSupabaseConnection();
        health.checks = {
            ...health.checks as object,
            supabase: supabaseOk ? 'connected' : 'failed',
        };
        if (!supabaseOk) health.status = 'degraded';
    } catch (error) {
        health.checks = {
            ...health.checks as object,
            supabase: `error: ${error instanceof Error ? error.message : 'unknown'}`,
        };
        health.status = 'degraded';
    }

    // Check MQTT config
    const mqttConfig = getMqttConfig();
    const mqttConfigured = !!(mqttConfig.brokerUrl && mqttConfig.username && mqttConfig.password);
    health.checks = {
        ...health.checks as object,
        mqtt: mqttConfigured ? 'configured' : 'missing credentials',
    };
    if (!mqttConfigured) health.status = 'degraded';

    // Env check
    health.env = {
        NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'set' : 'missing',
        SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ? 'set' : 'missing',
        MQTT_BROKER_URL: process.env.MQTT_BROKER_URL ? 'set' : 'missing',
        MQTT_USERNAME: process.env.MQTT_USERNAME ? 'set' : 'missing',
        MQTT_PASSWORD: process.env.MQTT_PASSWORD ? 'set' : 'missing',
    };

    console.log('[Health]', JSON.stringify(health, null, 2));

    return NextResponse.json(health, {
        status: health.status === 'ok' ? 200 : 503,
    });
}
