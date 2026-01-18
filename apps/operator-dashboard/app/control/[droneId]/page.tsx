'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import type { Drone, Delivery } from '@udd/shared';
import MapComponent from '@/components/MapComponent';

interface TelemetryData {
    latitude: number;
    longitude: number;
    altitude: number;
    heading: number;
    battery_level: number;
    speed: number;
    status?: string;
    timestamp: string;
}

export default function DroneControlPage() {
    const params = useParams();
    const router = useRouter();
    const droneId = params.droneId as string;

    const [drone, setDrone] = useState<Drone | null>(null);
    const [telemetry, setTelemetry] = useState<TelemetryData | null>(null);
    const [delivery, setDelivery] = useState<Delivery | null>(null);
    const [loading, setLoading] = useState(true);
    const [commandLoading, setCommandLoading] = useState<string | null>(null);

    // Load initial drone data
    useEffect(() => {
        const loadDrone = async () => {
            try {
                const res = await fetch(`/api/drones`);
                if (res.ok) {
                    const drones = await res.json();
                    const found = drones.find((d: Drone) => d.id === droneId);
                    if (found) {
                        setDrone(found);
                        setTelemetry({
                            latitude: found.current_lat || 51.4416,
                            longitude: found.current_lng || 5.4697,
                            altitude: 0,
                            heading: 0,
                            battery_level: found.battery_level,
                            speed: 0,
                            status: found.status,
                            timestamp: new Date().toISOString(),
                        });
                    }
                }
            } catch (error) {
                console.error('Failed to load drone:', error);
            } finally {
                setLoading(false);
            }
        };

        loadDrone();
    }, [droneId]);

    // Connect to telemetry SSE stream
    useEffect(() => {
        if (!droneId) return;

        const eventSource = new EventSource(`/api/drones/${droneId}/telemetry`);

        eventSource.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                setTelemetry(data);
            } catch (error) {
                console.error('Failed to parse telemetry:', error);
            }
        };

        eventSource.onerror = () => {
            console.error('Telemetry stream error');
            eventSource.close();
        };

        return () => {
            eventSource.close();
        };
    }, [droneId]);

    const sendCommand = useCallback(async (command: string) => {
        setCommandLoading(command);
        try {
            const res = await fetch(`/api/drones/${droneId}/command`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ command }),
            });

            if (!res.ok) {
                const error = await res.json();
                alert(error.error || 'Command failed');
            }
        } catch (error) {
            alert('Network error');
        } finally {
            setCommandLoading(null);
        }
    }, [droneId]);

    const getHeadingDirection = (heading: number): string => {
        const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
        const index = Math.round(heading / 45) % 8;
        return directions[index];
    };

    const statusColors: Record<string, string> = {
        idle: 'bg-green-500',
        flying: 'bg-blue-500',
        returning: 'bg-yellow-500',
        charging: 'bg-orange-500',
        offline: 'bg-gray-500',
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-900">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500"></div>
            </div>
        );
    }

    if (!drone) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">
                <div className="text-center">
                    <h1 className="text-2xl font-bold mb-4">Drone not found</h1>
                    <Link href="/dashboard" className="text-cyan-500 hover:underline">
                        Back to Dashboard
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-900 text-white">
            {/* Header */}
            <header className="bg-gray-800 border-b border-gray-700 px-6 py-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link href="/dashboard" className="text-gray-400 hover:text-white transition-colors">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                        </Link>
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-cyan-500 rounded-lg flex items-center justify-center overflow-hidden">
                                <div className="w-12 h-12 bg-white/10 backdrop-blur-md rounded-xl flex items-center justify-center p-2 border border-white/20 shadow-lg">
                                    <img src="/drone_icon_transparent.png" alt="UDD" className="w-full h-full object-contain" />
                                </div>
                            </div>
                            <div>
                                <h1 className="text-xl font-bold">UDD</h1>
                                <p className="text-sm text-gray-400">Operator Dashboard</p>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusColors[telemetry?.status || drone.status]} text-white`}>
                            {(telemetry?.status || drone.status).charAt(0).toUpperCase() + (telemetry?.status || drone.status).slice(1)}
                        </span>
                    </div>
                </div>
            </header>

            <div className="p-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Map Placeholder */}
                    <div className="lg:col-span-2 bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-700">
                            <h2 className="text-lg font-semibold">Live Map</h2>
                        </div>
                        <div className="h-96 bg-gray-700 flex items-center justify-center relative">
                            {telemetry && (
                                <MapComponent
                                    center={{
                                        lat: telemetry.latitude,
                                        lng: telemetry.longitude
                                    }}
                                    zoom={15}
                                />
                            )}
                            {!telemetry && (
                                <div className="text-center text-gray-400">
                                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500 mx-auto mb-4"></div>
                                    <p className="text-lg font-medium">Waiting for Telemetry...</p>
                                </div>
                            )}

                            {/* Compass indicator */}
                            <div className="absolute top-4 right-4 w-16 h-16 bg-gray-800 rounded-full border border-gray-600 flex items-center justify-center">
                                <div
                                    className="w-12 h-12 relative"
                                    style={{ transform: `rotate(${telemetry?.heading || 0}deg)` }}
                                >
                                    <svg className="w-full h-full text-cyan-500" fill="currentColor" viewBox="0 0 24 24">
                                        <path d="M12 2l3 9h-6l3-9z" />
                                    </svg>
                                </div>
                                <span className="absolute -bottom-6 text-xs text-gray-400">
                                    {telemetry?.heading || 0}° {getHeadingDirection(telemetry?.heading || 0)}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Telemetry Panel */}
                    <div className="space-y-6">
                        {/* Telemetry Data */}
                        <div className="bg-gray-800 rounded-xl border border-gray-700">
                            <div className="px-6 py-4 border-b border-gray-700">
                                <h2 className="text-lg font-semibold">Telemetry</h2>
                            </div>
                            <div className="p-4 grid grid-cols-2 gap-4">
                                <div className="bg-gray-700/50 rounded-lg p-4">
                                    <p className="text-gray-400 text-sm">Battery</p>
                                    <div className="flex items-center gap-2">
                                        <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                        </svg>
                                        <span className="text-2xl font-bold">{telemetry?.battery_level || 0}%</span>
                                    </div>
                                </div>
                                <div className="bg-gray-700/50 rounded-lg p-4">
                                    <p className="text-gray-400 text-sm">Altitude</p>
                                    <div className="flex items-center gap-2">
                                        <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11l5-5m0 0l5 5m-5-5v12" />
                                        </svg>
                                        <span className="text-2xl font-bold">{(telemetry?.altitude || 0).toFixed(1)}m</span>
                                    </div>
                                </div>
                                <div className="bg-gray-700/50 rounded-lg p-4">
                                    <p className="text-gray-400 text-sm">Speed</p>
                                    <div className="flex items-center gap-2">
                                        <svg className="w-5 h-5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                        </svg>
                                        <span className="text-2xl font-bold">{(telemetry?.speed || 0).toFixed(1)}m/s</span>
                                    </div>
                                </div>
                                <div className="bg-gray-700/50 rounded-lg p-4">
                                    <p className="text-gray-400 text-sm">Heading</p>
                                    <div className="flex items-center gap-2">
                                        <svg className="w-5 h-5 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                                        </svg>
                                        <span className="text-2xl font-bold">{telemetry?.heading || 0}°</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Control Buttons */}
                        <div className="bg-gray-800 rounded-xl border border-gray-700">
                            <div className="px-6 py-4 border-b border-gray-700">
                                <h2 className="text-lg font-semibold">Controls</h2>
                            </div>
                            <div className="p-4 space-y-3">
                                <button
                                    onClick={() => sendCommand('takeoff')}
                                    disabled={commandLoading !== null}
                                    className="w-full py-3 bg-green-600 hover:bg-green-500 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                                    </svg>
                                    {commandLoading === 'takeoff' ? 'Sending...' : 'Takeoff'}
                                </button>
                                <button
                                    onClick={() => sendCommand('hover')}
                                    disabled={commandLoading !== null}
                                    className="w-full py-3 bg-yellow-600 hover:bg-yellow-500 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    {commandLoading === 'hover' ? 'Sending...' : 'Hover'}
                                </button>
                                <button
                                    onClick={() => sendCommand('return_home')}
                                    disabled={commandLoading !== null}
                                    className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                                    </svg>
                                    {commandLoading === 'return_home' ? 'Sending...' : 'Return Home'}
                                </button>
                                <button
                                    onClick={() => sendCommand('land')}
                                    disabled={commandLoading !== null}
                                    className="w-full py-3 bg-red-600 hover:bg-red-500 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                                    </svg>
                                    {commandLoading === 'land' ? 'Sending...' : 'Land'}
                                </button>
                            </div>
                        </div>

                        {/* Unlock Storage */}
                        <div className="bg-gray-800 rounded-xl border border-gray-700">
                            <div className="px-6 py-4 border-b border-gray-700">
                                <h2 className="text-lg font-semibold">Storage</h2>
                            </div>
                            <div className="p-4">
                                <button
                                    onClick={() => sendCommand('unlock')}
                                    disabled={commandLoading !== null}
                                    className="w-full py-3 bg-purple-600 hover:bg-purple-500 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
                                    </svg>
                                    {commandLoading === 'unlock' ? 'Sending...' : 'Unlock Storage'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Video Feed Placeholder */}
                <div className="mt-6 bg-gray-800 rounded-xl border border-gray-700">
                    <div className="px-6 py-4 border-b border-gray-700">
                        <h2 className="text-lg font-semibold">Video Feed</h2>
                    </div>
                    <div className="h-64 bg-gray-700 flex items-center justify-center">
                        <div className="text-center text-gray-400">
                            <svg className="w-16 h-16 mx-auto mb-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                            <p className="text-lg font-medium">Video Feed</p>
                            <p className="text-sm">Connect ESP32-CAM to enable live video</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
