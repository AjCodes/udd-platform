import { NextResponse } from 'next/server';
import { testSupabaseConnection } from '@udd/shared';
import { getMqttConfig } from '@udd/shared';

// Health check endpoint (optimized to avoid high latency)
export async function GET() {
    const startTime = Date.now();
    const health: Record<string, unknown> = {
        status: 'ok',
        timestamp: new Date().toISOString(),
        checks: {},
    };

    // Quick env check first (no async operations)
    health.env = {
        NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'set' : 'missing',
        SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ? 'set' : 'missing',
        MQTT_BROKER_URL: process.env.MQTT_BROKER_URL ? 'set' : 'missing',
        MQTT_USERNAME: process.env.MQTT_USERNAME ? 'set' : 'missing',
        MQTT_PASSWORD: process.env.MQTT_PASSWORD ? 'set' : 'missing',
    };

    // Check Supabase with timeout
    try {
        const supabaseOk = await Promise.race([
            testSupabaseConnection(),
            new Promise<boolean>((resolve) => setTimeout(() => resolve(false), 2000))
        ]);
        health.checks = {
            ...health.checks as object,
            supabase: supabaseOk ? 'connected' : 'timeout/failed',
        };
        if (!supabaseOk) health.status = 'degraded';
    } catch (error) {
        health.checks = {
            ...health.checks as object,
            supabase: `error: ${error instanceof Error ? error.message : 'unknown'}`,
        };
        health.status = 'degraded';
    }

    // Check MQTT config (synchronous)
    const mqttConfig = getMqttConfig();
    const mqttConfigured = !!(mqttConfig.brokerUrl && mqttConfig.username && mqttConfig.password);
    health.checks = {
        ...health.checks as object,
        mqtt: mqttConfigured ? 'configured' : 'missing credentials',
    };
    if (!mqttConfigured) health.status = 'degraded';

    const duration = Date.now() - startTime;
    if (duration > 1000) {
        console.warn(`[Health] Slow health check: ${duration}ms`);
    }

    return NextResponse.json(health, {
        status: health.status === 'ok' ? 200 : 503,
    });
}
