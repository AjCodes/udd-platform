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
    const [activeDelivery, setActiveDelivery] = useState<Delivery | null>(null);

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

    // Load active delivery for this drone
    useEffect(() => {
        const loadActiveDelivery = async () => {
            try {
                const res = await fetch(`/api/deliveries`);
                if (res.ok) {
                    const allDeliveries = await res.json();
                    const active = allDeliveries.find(
                        (d: Delivery) => d.drone_id === droneId && ['assigned', 'in_transit'].includes(d.status)
                    );
                    setActiveDelivery(active || null);
                }
            } catch (error) {
                console.error('Failed to load delivery:', error);
            }
        };

        if (droneId) {
            loadActiveDelivery();
            const interval = setInterval(loadActiveDelivery, 5000);
            return () => clearInterval(interval);
        }
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

            if (res.ok) {
                console.log(`[Control] Command '${command}' successful`);
                // Optimistic update for telemetry and drone state
                type DroneStatus = 'idle' | 'flying' | 'charging' | 'returning' | 'offline';
                let nextStatus: DroneStatus = (telemetry?.status || drone?.status || 'idle') as DroneStatus;
                if (command === 'takeoff' || command === 'hover') nextStatus = 'flying';
                if (command === 'land') nextStatus = ((telemetry?.battery_level || drone?.battery_level || 0) < 100) ? 'charging' : 'idle';
                if (command === 'return_home') nextStatus = 'returning';

                setTelemetry(prev => prev ? { ...prev, status: nextStatus } : prev);
                setDrone(prev => prev ? { ...prev, status: nextStatus } : prev);

                // Simulate return home completion after random 2-10 seconds
                if (command === 'return_home') {
                    const delay = Math.floor(Math.random() * 8000) + 2000; // 2-10 seconds
                    setTimeout(() => {
                        const finalStatus: DroneStatus = ((telemetry?.battery_level || drone?.battery_level || 0) < 100) ? 'charging' : 'idle';
                        setTelemetry(prev => prev ? { ...prev, status: finalStatus } : prev);
                        setDrone(prev => prev ? { ...prev, status: finalStatus } : prev);
                    }, delay);
                }
            } else {
                const error = await res.json();
                alert(error.error || 'Command failed');
            }
        } catch (error) {
            alert('Network error');
        } finally {
            setCommandLoading(null);
        }
    }, [droneId, telemetry, drone]);

    const getHeadingDirection = (heading: number): string => {
        const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
        const index = Math.round(heading / 45) % 8;
        return directions[index];
    };

    const statusColors: Record<string, string> = {
        idle: 'bg-green-500',
        flying: 'bg-blue-500',
        delivering: 'bg-violet-500',
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
                        <Link
                            href="/dashboard"
                            className="text-gray-400 hover:text-white transition-colors"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                        </Link>
                        <div className="flex items-center gap-3">
                            <div>
                                <h1 className="text-xl font-bold">UDD Operator Dashboard</h1>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <span className={`px-3 py-1 rounded-full text-sm font-medium text-white ${(telemetry?.status || drone.status) === 'flying'
                            ? (activeDelivery ? 'bg-violet-500' : 'bg-blue-500')
                            : (telemetry?.status || drone.status) === 'returning'
                                ? 'bg-yellow-500'
                                : (telemetry?.status || drone.status) === 'charging'
                                    ? 'bg-orange-500'
                                    : statusColors[telemetry?.status || drone.status]
                            }`}>
                            {(telemetry?.status || drone.status) === 'flying'
                                ? (activeDelivery ? 'Delivering' : 'Flying')
                                : ((telemetry?.status || drone.status).charAt(0).toUpperCase() + (telemetry?.status || drone.status).slice(1))}
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
                                Live Map
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
                        {/* Drone Status Panel */}
                        <div className="bg-gray-800 rounded-xl border border-gray-700 shadow-xl overflow-hidden">
                            <div className="px-6 py-4 border-b border-gray-700 bg-gray-800/50">
                                <h2 className="text-sm font-bold uppercase tracking-widest text-gray-400">Drone Status</h2>
                            </div>
                            <div className="p-4">
                                {activeDelivery ? (
                                    <Link
                                        href={`/delivery/${activeDelivery.id}`}
                                        className="block bg-violet-500/10 border border-violet-500/30 rounded-xl p-4 hover:bg-violet-500/20 transition-all group"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-violet-500 rounded-lg flex items-center justify-center">
                                                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                                                </svg>
                                            </div>
                                            <div className="flex-1">
                                                <p className="text-xs font-bold text-violet-400 uppercase tracking-widest mb-1">Delivering</p>
                                                <p className="text-sm text-white font-medium truncate group-hover:text-violet-300 transition-colors">
                                                    → {activeDelivery.dropoff_address?.split(',')[0] || 'Destination'}
                                                </p>
                                            </div>
                                            <svg className="w-5 h-5 text-gray-500 group-hover:text-violet-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                            </svg>
                                        </div>
                                    </Link>
                                ) : telemetry?.status === 'returning' ? (
                                    <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-yellow-500 rounded-lg flex items-center justify-center">
                                                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                                                </svg>
                                            </div>
                                            <div>
                                                <p className="text-xs font-bold text-yellow-400 uppercase tracking-widest mb-1">Returning Home</p>
                                                <p className="text-sm text-white font-medium">Flying back to station</p>
                                            </div>
                                        </div>
                                    </div>
                                ) : telemetry?.status === 'charging' ? (
                                    <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-orange-500 rounded-lg flex items-center justify-center">
                                                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                                </svg>
                                            </div>
                                            <div>
                                                <p className="text-xs font-bold text-orange-400 uppercase tracking-widest mb-1">Charging</p>
                                                <p className="text-sm text-white font-medium">
                                                    Battery at {telemetry?.battery_level || 0}% · {(telemetry?.battery_level || 0) >= 60 ? 'Ready for delivery' : 'Not ready for delivery'}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                ) : (telemetry?.battery_level || 0) >= 65 ? (
                                    <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center">
                                                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                </svg>
                                            </div>
                                            <div>
                                                <p className="text-xs font-bold text-green-400 uppercase tracking-widest mb-1">Ready</p>
                                                <p className="text-sm text-white font-medium">Ready for delivery</p>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-red-500 rounded-lg flex items-center justify-center">
                                                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                                </svg>
                                            </div>
                                            <div>
                                                <p className="text-xs font-bold text-red-400 uppercase tracking-widest mb-1">Low Battery</p>
                                                <p className="text-sm text-white font-medium">Need to charge battery ({telemetry?.battery_level || 0}%)</p>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

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
                                    <p className="text-[10px] uppercase font-bold text-gray-500 mb-1">Speed</p>
                                    <div className="flex items-center gap-2">
                                        <svg className="w-6 h-6 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                        </svg>
                                        <span className="text-2xl font-black text-white">{((telemetry?.speed || 0) * 3.6).toFixed(1)}km/h</span>
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
                            </div>
                        </div>

                        {/* Storage Compartment */}
                        <div className="bg-gray-800 rounded-xl border border-gray-700 shadow-xl overflow-hidden">
                            <div className="px-6 py-4 border-b border-gray-700 bg-gray-800/50">
                                <h2 className="text-sm font-bold uppercase tracking-widest text-gray-400">Storage Compartment</h2>
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
