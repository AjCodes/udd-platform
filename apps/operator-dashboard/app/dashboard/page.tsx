'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { Delivery, Drone } from '@udd/shared';

export default function DashboardPage() {
    const [deliveries, setDeliveries] = useState<Delivery[]>([]);
    const [drones, setDrones] = useState<Drone[]>([]);
    const [loading, setLoading] = useState(true);
    const [claimingId, setClaimingId] = useState<string | null>(null);

    useEffect(() => {
        loadData();
        // Poll for updates every 5 seconds
        const interval = setInterval(loadData, 5000);
        return () => clearInterval(interval);
    }, []);

    const loadData = async () => {
        try {
            // Fetch pending deliveries
            const deliveriesRes = await fetch('/api/deliveries/available');
            if (deliveriesRes.ok) {
                const data = await deliveriesRes.json();
                setDeliveries(data);
            }

            // Fetch drones
            const dronesRes = await fetch('/api/drones');
            if (dronesRes.ok) {
                const data = await dronesRes.json();
                setDrones(data);
            }
        } catch (error) {
            console.error('Failed to load data:', error);
        } finally {
            setLoading(false);
        }
    };

    const claimDelivery = async (deliveryId: string) => {
        setClaimingId(deliveryId);
        try {
            const res = await fetch(`/api/deliveries/${deliveryId}/claim`, {
                method: 'POST',
            });
            if (res.ok) {
                // Refresh data
                await loadData();
            } else {
                const error = await res.json();
                alert(error.error || 'Failed to claim delivery');
            }
        } catch (error) {
            alert('Network error');
        } finally {
            setClaimingId(null);
        }
    };

    const statusColors: Record<string, string> = {
        idle: 'bg-green-100 text-green-700',
        flying: 'bg-blue-100 text-blue-700',
        returning: 'bg-yellow-100 text-yellow-700',
        charging: 'bg-orange-100 text-orange-700',
        offline: 'bg-gray-100 text-gray-500',
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
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-cyan-500 rounded-lg flex items-center justify-center">
                            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                            </svg>
                        </div>
                        <div>
                            <h1 className="text-xl font-bold">UDD Operator Dashboard</h1>
                            <p className="text-sm text-gray-400">Drone Control Center</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <span className="flex items-center gap-2 text-sm text-gray-400">
                            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                            Connected
                        </span>
                    </div>
                </div>
            </header>

            <div className="flex">
                {/* Sidebar */}
                <aside className="w-64 bg-gray-800 border-r border-gray-700 min-h-[calc(100vh-73px)] p-4">
                    <nav className="space-y-2">
                        <Link href="/dashboard" className="flex items-center gap-3 px-4 py-3 bg-gray-700 rounded-lg text-white">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                            </svg>
                            Dashboard
                        </Link>
                        <Link href="/deliveries" className="flex items-center gap-3 px-4 py-3 text-gray-400 hover:bg-gray-700 rounded-lg transition-colors">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                            </svg>
                            Deliveries
                        </Link>
                        <Link href="/drones" className="flex items-center gap-3 px-4 py-3 text-gray-400 hover:bg-gray-700 rounded-lg transition-colors">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                            </svg>
                            Drones
                        </Link>
                    </nav>
                </aside>

                {/* Main Content */}
                <main className="flex-1 p-6">
                    {/* Stats Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                        <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-gray-400 text-sm">Pending Deliveries</p>
                                    <p className="text-3xl font-bold text-yellow-500">{deliveries.length}</p>
                                </div>
                                <div className="w-12 h-12 bg-yellow-500/20 rounded-lg flex items-center justify-center">
                                    <svg className="w-6 h-6 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </div>
                            </div>
                        </div>
                        <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-gray-400 text-sm">Active Drones</p>
                                    <p className="text-3xl font-bold text-blue-500">{drones.filter(d => d.status === 'flying').length}</p>
                                </div>
                                <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center">
                                    <svg className="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                                    </svg>
                                </div>
                            </div>
                        </div>
                        <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-gray-400 text-sm">Available Drones</p>
                                    <p className="text-3xl font-bold text-green-500">{drones.filter(d => d.status === 'idle').length}</p>
                                </div>
                                <div className="w-12 h-12 bg-green-500/20 rounded-lg flex items-center justify-center">
                                    <svg className="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </div>
                            </div>
                        </div>
                        <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-gray-400 text-sm">Total Drones</p>
                                    <p className="text-3xl font-bold text-cyan-500">{drones.length}</p>
                                </div>
                                <div className="w-12 h-12 bg-cyan-500/20 rounded-lg flex items-center justify-center">
                                    <svg className="w-6 h-6 text-cyan-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                                    </svg>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Pending Deliveries */}
                        <div className="bg-gray-800 rounded-xl border border-gray-700">
                            <div className="px-6 py-4 border-b border-gray-700">
                                <h2 className="text-lg font-semibold flex items-center gap-2">
                                    <svg className="w-5 h-5 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                                    </svg>
                                    Pending Deliveries
                                </h2>
                            </div>
                            <div className="p-4 max-h-96 overflow-y-auto">
                                {deliveries.length === 0 ? (
                                    <div className="text-center py-8 text-gray-500">
                                        <svg className="w-12 h-12 mx-auto mb-3 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                                        </svg>
                                        <p>No pending deliveries</p>
                                        <p className="text-sm text-gray-600">Waiting for new orders...</p>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {deliveries.map((delivery) => (
                                            <div key={delivery.id} className="bg-gray-700/50 rounded-lg p-4 border border-gray-600">
                                                <div className="flex justify-between items-start mb-2">
                                                    <div>
                                                        <p className="text-sm text-gray-400">Order #{delivery.id.slice(0, 8)}</p>
                                                        <p className="font-medium text-white">{delivery.pickup_address || 'Pickup location'}</p>
                                                        <p className="text-gray-400 text-sm">→ {delivery.dropoff_address || 'Dropoff location'}</p>
                                                    </div>
                                                    <span className="px-2 py-1 bg-yellow-500/20 text-yellow-400 rounded text-xs font-medium">
                                                        Pending
                                                    </span>
                                                </div>
                                                {delivery.package_description && (
                                                    <p className="text-sm text-gray-400 mb-3">{delivery.package_description}</p>
                                                )}
                                                <button
                                                    onClick={() => claimDelivery(delivery.id)}
                                                    disabled={claimingId === delivery.id}
                                                    className="w-full py-2 bg-cyan-600 hover:bg-cyan-500 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
                                                >
                                                    {claimingId === delivery.id ? 'Claiming...' : 'Claim Delivery'}
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Drone Status */}
                        <div className="bg-gray-800 rounded-xl border border-gray-700">
                            <div className="px-6 py-4 border-b border-gray-700">
                                <h2 className="text-lg font-semibold flex items-center gap-2">
                                    <svg className="w-5 h-5 text-cyan-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                                    </svg>
                                    Drone Fleet
                                </h2>
                            </div>
                            <div className="p-4 max-h-96 overflow-y-auto">
                                {drones.length === 0 ? (
                                    <div className="text-center py-8 text-gray-500">
                                        <svg className="w-12 h-12 mx-auto mb-3 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                                        </svg>
                                        <p>No drones registered</p>
                                        <p className="text-sm text-gray-600">Add drones in Supabase</p>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {drones.map((drone) => (
                                            <Link
                                                key={drone.id}
                                                href={`/control/${drone.id}`}
                                                className="block bg-gray-700/50 rounded-lg p-4 border border-gray-600 hover:border-cyan-500 transition-colors"
                                            >
                                                <div className="flex justify-between items-start mb-3">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 bg-gray-600 rounded-lg flex items-center justify-center">
                                                            <svg className="w-6 h-6 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                                                            </svg>
                                                        </div>
                                                        <div>
                                                            <p className="font-medium text-white">{drone.name}</p>
                                                            <p className="text-sm text-gray-400">ID: {drone.id.slice(0, 8)}</p>
                                                        </div>
                                                    </div>
                                                    <span className={`px-2 py-1 rounded text-xs font-medium ${statusColors[drone.status]}`}>
                                                        {drone.status.charAt(0).toUpperCase() + drone.status.slice(1)}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-4 text-sm">
                                                    <div className="flex items-center gap-1">
                                                        <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                                        </svg>
                                                        <span className="text-gray-300">{drone.battery_level}%</span>
                                                    </div>
                                                    {drone.current_lat && drone.current_lng && (
                                                        <div className="flex items-center gap-1">
                                                            <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                                            </svg>
                                                            <span className="text-gray-300">{drone.current_lat.toFixed(4)}, {drone.current_lng.toFixed(4)}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </Link>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
}
