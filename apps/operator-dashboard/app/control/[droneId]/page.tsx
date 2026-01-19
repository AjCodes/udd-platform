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
                        <Link href="/deliveries" className="text-gray-400 hover:text-white transition-colors">
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
                    {/* Map */}
                    <div className="lg:col-span-2 bg-gray-800 rounded-xl border border-gray-700 overflow-hidden shadow-2xl">
                        <div className="px-6 py-4 border-b border-gray-700 flex justify-between items-center bg-gray-800/50 backdrop-blur-sm">
                            <h2 className="text-lg font-semibold flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse"></span>
                                Live Mission Map
                            </h2>
                        </div>
                        <div className="h-[500px] bg-gray-700 flex items-center justify-center relative">
                            {telemetry ? (
                                <MapComponent
                                    center={{
                                        lat: telemetry.latitude,
                                        lng: telemetry.longitude
                                    }}
                                    zoom={16}
                                />
                            ) : (
                                <div className="text-center text-gray-400">
                                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500 mx-auto mb-4"></div>
                                    <p className="text-lg font-medium">Waiting for Telemetry...</p>
                                </div>
                            )}

                            {/* Compass indicator */}
                            <div className="absolute top-6 right-6 w-20 h-20 bg-gray-900/80 backdrop-blur-md rounded-full border border-white/10 flex items-center justify-center shadow-2xl">
                                <div
                                    className="w-14 h-14 relative transition-transform duration-500"
                                    style={{ transform: `rotate(${telemetry?.heading || 0}deg)` }}
                                >
                                    <svg className="w-full h-full text-cyan-500 drop-shadow-[0_0_8px_rgba(6,182,212,0.5)]" fill="currentColor" viewBox="0 0 24 24">
                                        <path d="M12 2l4 10h-8l4-10z" className="opacity-100" />
                                        <path d="M12 22l-4-10h8l-4 10z" className="opacity-20" />
                                    </svg>
                                </div>
                                <div className="absolute -bottom-8 bg-gray-900/80 backdrop-blur-md px-3 py-1 rounded-full border border-white/10 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                    {telemetry?.heading || 0}° {getHeadingDirection(telemetry?.heading || 0)}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Panels */}
                    <div className="space-y-6">
                        {/* Telemetry Panel */}
                        <div className="bg-gray-800 rounded-xl border border-gray-700 shadow-xl overflow-hidden">
                            <div className="px-6 py-4 border-b border-gray-700 bg-gray-800/50">
                                <h2 className="text-sm font-bold uppercase tracking-widest text-gray-400">Drone Telemetry</h2>
                            </div>
                            <div className="p-4 grid grid-cols-2 gap-3">
                                <div className="bg-gray-900 p-4 rounded-xl border border-white/5 shadow-inner">
                                    <p className="text-[10px] uppercase font-bold text-gray-500 mb-1">Battery</p>
                                    <div className="flex items-center gap-2">
                                        <div className="relative w-6 h-6">
                                            <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                            </svg>
                                        </div>
                                        <span className="text-2xl font-black text-white">{telemetry?.battery_level || 0}%</span>
                                    </div>
                                    <div className="mt-2 h-1 bg-gray-800 rounded-full overflow-hidden">
                                        <div className="h-full bg-green-500" style={{ width: `${telemetry?.battery_level || 0}%` }}></div>
                                    </div>
                                </div>
                                <div className="bg-gray-900 p-4 rounded-xl border border-white/5 shadow-inner">
                                    <p className="text-[10px] uppercase font-bold text-gray-500 mb-1">Altitude</p>
                                    <div className="flex items-center gap-2">
                                        <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11l5-5m0 0l5 5m-5-5v12" />
                                        </svg>
                                        <span className="text-2xl font-black text-white">{(telemetry?.altitude || 0).toFixed(1)}m</span>
                                    </div>
                                </div>
                                <div className="bg-gray-900 p-4 rounded-xl border border-white/5 shadow-inner">
                                    <p className="text-[10px] uppercase font-bold text-gray-500 mb-1">Ground Speed</p>
                                    <div className="flex items-center gap-2">
                                        <svg className="w-6 h-6 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                        </svg>
                                        <span className="text-2xl font-black text-white">{(telemetry?.speed || 0).toFixed(1)}m/s</span>
                                    </div>
                                </div>
                                <div className="bg-gray-900 p-4 rounded-xl border border-white/5 shadow-inner">
                                    <p className="text-[10px] uppercase font-bold text-gray-500 mb-1">Heading</p>
                                    <div className="flex items-center gap-2">
                                        <svg className="w-6 h-6 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                                        </svg>
                                        <span className="text-2xl font-black text-white">{telemetry?.heading || 0}°</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Control Buttons */}
                        <div className="bg-gray-800 rounded-xl border border-gray-700 shadow-xl overflow-hidden">
                            <div className="px-6 py-4 border-b border-gray-700 bg-gray-800/50">
                                <h2 className="text-sm font-bold uppercase tracking-widest text-gray-400">Flight Controls</h2>
                            </div>
                            <div className="p-4 space-y-3">
                                <button
                                    onClick={() => sendCommand('takeoff')}
                                    disabled={commandLoading !== null}
                                    className="w-full py-4 bg-green-600 hover:bg-green-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-black transition-all shadow-lg shadow-green-600/20 flex items-center justify-center gap-3 active:scale-[0.98]"
                                >
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                                    </svg>
                                    {commandLoading === 'takeoff' ? 'SENDING...' : 'TAKEOFF'}
                                </button>
                                <button
                                    onClick={() => sendCommand('hover')}
                                    disabled={commandLoading !== null}
                                    className="w-full py-4 bg-yellow-600 hover:bg-yellow-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-black transition-all shadow-lg shadow-yellow-600/20 flex items-center justify-center gap-3 active:scale-[0.98]"
                                >
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    {commandLoading === 'hover' ? 'SENDING...' : 'HOVER'}
                                </button>
                                <button
                                    onClick={() => sendCommand('return_home')}
                                    disabled={commandLoading !== null}
                                    className="w-full py-4 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-black transition-all shadow-lg shadow-blue-600/20 flex items-center justify-center gap-3 active:scale-[0.98]"
                                >
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                                    </svg>
                                    {commandLoading === 'return_home' ? 'SENDING...' : 'RETURN HOME'}
                                </button>
                                <button
                                    onClick={() => sendCommand('land')}
                                    disabled={commandLoading !== null}
                                    className="w-full py-4 bg-red-600 hover:bg-red-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-black transition-all shadow-lg shadow-red-600/20 flex items-center justify-center gap-3 active:scale-[0.98]"
                                >
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                                    </svg>
                                    {commandLoading === 'land' ? 'SENDING...' : 'LAND'}
                                </button>
                            </div>
                        </div>

                        {/* Unlock Storage */}
                        <div className="bg-gray-800 rounded-xl border border-gray-700 shadow-xl overflow-hidden">
                            <div className="px-6 py-4 border-b border-gray-700 bg-gray-800/50">
                                <h2 className="text-sm font-bold uppercase tracking-widest text-gray-400">Cargo Handling</h2>
                            </div>
                            <div className="p-4">
                                <button
                                    onClick={() => sendCommand('unlock')}
                                    disabled={commandLoading !== null}
                                    className="w-full py-4 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-black transition-all shadow-lg shadow-purple-600/20 flex items-center justify-center gap-3 active:scale-[0.98]"
                                >
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
                                    </svg>
                                    {commandLoading === 'unlock' ? 'UNLOCKING...' : 'UNLOCK STORAGE'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
