'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { Delivery, Drone } from '@udd/shared';

import { createBrowserClient } from '@udd/shared';
import DeliveryQueue from '@/components/DeliveryQueue';

export default function DashboardPage() {
    const [deliveries, setDeliveries] = useState<Delivery[]>([]);
    const [drones, setDrones] = useState<Drone[]>([]);
    const [loading, setLoading] = useState(true);

    const supabase = createBrowserClient();

    useEffect(() => {
        loadData();

        // Subscribe to real-time updates for stats cards
        const subscription = supabase
            .channel('dashboard-stats-updates')
            // @ts-ignore
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'drones'
            }, (payload: any) => {
                console.log('[Dashboard] Drone update:', payload.eventType);
                loadData();
            })
            // @ts-ignore
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'deliveries'
            }, (payload: any) => {
                console.log('[Dashboard] Delivery update:', payload.eventType, payload.new?.id);
                loadData();
            })
            .subscribe((status) => {
                console.log('[Dashboard] Subscription status:', status);
                if (status === 'SUBSCRIBED') {
                    console.log('[Dashboard] Successfully subscribed to real-time updates');
                }
            });

        // Poll every 1 second as backup (real-time might not trigger without proper auth)
        const interval = setInterval(() => {
            loadData();
        }, 1000);

        // Refresh when window gains focus
        const handleFocus = () => {
            console.log('[Dashboard] Window focused, refreshing data');
            loadData();
        };
        window.addEventListener('focus', handleFocus);

        return () => {
            subscription.unsubscribe();
            clearInterval(interval);
            window.removeEventListener('focus', handleFocus);
        };
    }, []);

    const loadData = async () => {
        try {
            // Fetch deliveries through API (bypasses RLS)
            const deliveriesRes = await fetch('/api/deliveries', { cache: 'no-store' });
            if (deliveriesRes.ok) {
                const allDeliveries = await deliveriesRes.json();
                // Filter to match DeliveryQueue: only active deliveries (exclude delivered and cancelled)
                const activeDeliveries = allDeliveries.filter((d: Delivery) =>
                    ['pending', 'assigned', 'in_transit'].includes(d.status)
                );
                console.log('[Dashboard] Active deliveries:', activeDeliveries.length, 'out of', allDeliveries.length);
                setDeliveries(activeDeliveries);
            } else {
                console.error('[Dashboard] Failed to fetch deliveries:', deliveriesRes.status, deliveriesRes.statusText);
            }

            // Fetch drones for fleet status (already uses service role via API)
            const dronesRes = await fetch('/api/drones', { cache: 'no-store' });
            if (dronesRes.ok) {
                const data = await dronesRes.json();
                console.log('[Dashboard] Loaded drones:', data.length);

                const statusBreakdown = data.reduce((acc: Record<string, number>, d: Drone) => {
                    acc[d.status] = (acc[d.status] || 0) + 1;
                    return acc;
                }, {});
                console.log('[Dashboard] Drone status breakdown:', statusBreakdown);

                const flyingCount = data.filter((d: Drone) => d.status === 'flying').length;
                const idleCount = data.filter((d: Drone) => d.status === 'idle').length;
                console.log('[Dashboard] Stats - Flying:', flyingCount, 'Idle:', idleCount, 'Total:', data.length);

                setDrones(data);
            } else {
                console.error('[Dashboard] Failed to fetch drones:', dronesRes.status, dronesRes.statusText);
            }
        } catch (error) {
            console.error('[Dashboard] Failed to load data:', error);
        } finally {
            setLoading(false);
        }
    };

    const statusColors: Record<string, string> = {
        idle: 'bg-green-500/20 text-green-500',
        flying: 'bg-blue-500/20 text-blue-500',
        returning: 'bg-yellow-500/20 text-yellow-500',
        charging: 'bg-orange-500/20 text-orange-500',
        offline: 'bg-gray-700 text-gray-400',
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
                        <div className="w-16 h-16 bg-white/10 backdrop-blur-md rounded-xl flex items-center justify-center p-2 border border-white/20 shadow-lg">
                            <img src="/udd-logo-icon.png" alt="UDD" className="w-full h-full object-contain" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold">UDD</h1>
                            <p className="text-sm text-gray-400">Operator Dashboard</p>
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
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                        <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-gray-400 text-sm">Active Deliveries</p>
                                    <p className="text-3xl font-bold text-yellow-500">{deliveries.length}</p>
                                </div>
                                <div className="w-12 h-12 bg-yellow-500/20 rounded-lg flex items-center justify-center">
                                    <svg className="w-6 h-6 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
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
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Live Delivery Feed */}
                        <DeliveryQueue />

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
                            <div className="p-4 max-h-[500px] overflow-y-auto">
                                {drones.length === 0 ? (
                                    <div className="text-center py-8 text-gray-500">
                                        <svg className="w-12 h-12 mx-auto mb-3 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                                        </svg>
                                        <p>No drones registered</p>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {drones.map((drone) => (
                                            <div
                                                key={drone.id}
                                                className="bg-gray-700/50 rounded-lg p-4 border border-gray-600 transition-colors"
                                            >
                                                <div className="flex justify-between items-center">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 bg-gray-600 rounded-lg flex items-center justify-center">
                                                            <svg className="w-6 h-6 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                                                            </svg>
                                                        </div>
                                                        <div>
                                                            <p className="font-medium text-white">{drone.name}</p>
                                                            <p className="text-[10px] text-gray-500 font-mono tracking-tight uppercase">
                                                                {drone.id.slice(0, 8)} | LAT: {drone.current_lat?.toFixed(4)} LNG: {drone.current_lng?.toFixed(4)}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${statusColors[drone.status] || 'bg-gray-700 text-gray-400'}`}>
                                                        {drone.status}
                                                    </span>
                                                </div>
                                                <div className="mt-3 w-full bg-gray-800 rounded-full h-1">
                                                    <div
                                                        className={`h-full rounded-full transition-all duration-500 ${drone.battery_level < 20 ? 'bg-red-500' : 'bg-green-500'}`}
                                                        style={{ width: `${drone.battery_level}%` }}
                                                    ></div>
                                                </div>
                                            </div>
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
