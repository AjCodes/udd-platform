'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { Drone } from '@udd/shared';

export default function DronesPage() {
    const [drones, setDrones] = useState<Drone[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadDrones();
        const interval = setInterval(loadDrones, 5000);
        return () => clearInterval(interval);
    }, []);

    const loadDrones = async () => {
        try {
            const res = await fetch('/api/drones');
            if (res.ok) {
                const data = await res.json();
                setDrones(data);
            }
        } catch (error) {
            console.error('Failed to load drones:', error);
        } finally {
            setLoading(false);
        }
    };

    const statusColors: Record<string, string> = {
        idle: 'bg-green-500',
        flying: 'bg-blue-500',
        returning: 'bg-yellow-500',
        charging: 'bg-orange-500',
        offline: 'bg-gray-500',
    };

    const statusBgColors: Record<string, string> = {
        idle: 'bg-green-500/20 text-green-400',
        flying: 'bg-blue-500/20 text-blue-400',
        returning: 'bg-yellow-500/20 text-yellow-400',
        charging: 'bg-orange-500/20 text-orange-400',
        offline: 'bg-gray-500/20 text-gray-400',
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-900">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-900 text-white">
            {/* Header */}
            <header className="bg-gray-800 border-b border-gray-700 px-6 py-4">
                <div className="flex items-center gap-4">
                    <Link href="/dashboard" className="text-gray-400 hover:text-white transition-colors">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                    </Link>
                    <div>
                        <h1 className="text-xl font-bold">Drone Fleet</h1>
                        <p className="text-sm text-gray-400">Monitor and control drones</p>
                    </div>
                </div>
            </header>

            <div className="p-6">
                {/* Stats */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
                    <div className="bg-gray-800 rounded-xl p-4 border border-gray-700 text-center">
                        <p className="text-3xl font-bold text-white">{drones.length}</p>
                        <p className="text-sm text-gray-400">Total</p>
                    </div>
                    <div className="bg-gray-800 rounded-xl p-4 border border-gray-700 text-center">
                        <p className="text-3xl font-bold text-green-500">{drones.filter(d => d.status === 'idle').length}</p>
                        <p className="text-sm text-gray-400">Idle</p>
                    </div>
                    <div className="bg-gray-800 rounded-xl p-4 border border-gray-700 text-center">
                        <p className="text-3xl font-bold text-blue-500">{drones.filter(d => d.status === 'flying').length}</p>
                        <p className="text-sm text-gray-400">Flying</p>
                    </div>
                    <div className="bg-gray-800 rounded-xl p-4 border border-gray-700 text-center">
                        <p className="text-3xl font-bold text-orange-500">{drones.filter(d => d.status === 'charging').length}</p>
                        <p className="text-sm text-gray-400">Charging</p>
                    </div>
                    <div className="bg-gray-800 rounded-xl p-4 border border-gray-700 text-center">
                        <p className="text-3xl font-bold text-gray-500">{drones.filter(d => d.status === 'offline').length}</p>
                        <p className="text-sm text-gray-400">Offline</p>
                    </div>
                </div>

                {/* Drone Grid */}
                {drones.length === 0 ? (
                    <div className="bg-gray-800 rounded-xl border border-gray-700 p-8 text-center">
                        <svg className="w-16 h-16 mx-auto mb-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                        </svg>
                        <p className="text-gray-400">No drones registered</p>
                        <p className="text-sm text-gray-500">Add drones in the Supabase dashboard</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {drones.map((drone) => (
                            <Link
                                key={drone.id}
                                href={`/control/${drone.id}`}
                                className="bg-gray-800 rounded-xl border border-gray-700 p-6 hover:border-cyan-500 transition-colors group"
                            >
                                <div className="flex items-start justify-between mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-12 h-12 ${statusColors[drone.status]} rounded-xl flex items-center justify-center`}>
                                            <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                                            </svg>
                                        </div>
                                        <div>
                                            <h3 className="font-semibold text-lg group-hover:text-cyan-400 transition-colors">{drone.name}</h3>
                                            <p className="text-sm text-gray-500 font-mono">{drone.id.slice(0, 8)}</p>
                                        </div>
                                    </div>
                                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusBgColors[drone.status]}`}>
                                        {drone.status.charAt(0).toUpperCase() + drone.status.slice(1)}
                                    </span>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-sm text-gray-500">Battery</p>
                                        <div className="flex items-center gap-2">
                                            <div className="flex-1 h-2 bg-gray-700 rounded-full overflow-hidden">
                                                <div
                                                    className={`h-full ${drone.battery_level > 50 ? 'bg-green-500' :
                                                            drone.battery_level > 20 ? 'bg-yellow-500' : 'bg-red-500'
                                                        }`}
                                                    style={{ width: `${drone.battery_level}%` }}
                                                />
                                            </div>
                                            <span className="text-sm font-medium">{drone.battery_level}%</span>
                                        </div>
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-500">Location</p>
                                        {drone.current_lat && drone.current_lng ? (
                                            <p className="text-sm font-mono">
                                                {drone.current_lat.toFixed(4)}, {drone.current_lng.toFixed(4)}
                                            </p>
                                        ) : (
                                            <p className="text-sm text-gray-500">Unknown</p>
                                        )}
                                    </div>
                                </div>

                                <div className="mt-4 pt-4 border-t border-gray-700 flex items-center justify-between">
                                    <span className="text-sm text-gray-500">Click to control</span>
                                    <svg className="w-5 h-5 text-gray-500 group-hover:text-cyan-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                    </svg>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
