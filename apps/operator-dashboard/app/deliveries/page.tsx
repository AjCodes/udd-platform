'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { Delivery } from '@udd/shared';

export default function DeliveriesPage() {
    const [deliveries, setDeliveries] = useState<Delivery[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'pending' | 'active' | 'history'>('pending');

    const pendingDeliveries = (deliveries || []).filter(d => d.status === 'pending');
    const myDeliveries = (deliveries || []).filter(d => ['assigned', 'in_transit'].includes(d.status));
    const historyDeliveries = (deliveries || []).filter(d => ['delivered', 'cancelled'].includes(d.status));

    useEffect(() => {
        loadDeliveries();
        // Poll every 5 seconds to ensure updates are seen quickly
        const interval = setInterval(loadDeliveries, 5000);
        return () => clearInterval(interval);
    }, []);

    // Auto-switch tab if needed
    useEffect(() => {
        if (!loading && activeTab === 'pending' && pendingDeliveries.length === 0 && myDeliveries.length > 0) {
            console.log('[DeliveriesPage] No pending deliveries, auto-switching to Active tab');
            setActiveTab('active');
        }
    }, [pendingDeliveries.length, myDeliveries.length, loading, activeTab]);

    const loadDeliveries = async () => {
        try {
            const res = await fetch('/api/deliveries', { cache: 'no-store' });
            if (res.ok) {
                const data = await res.json();
                console.log('[DeliveriesPage] All deliveries loaded:', data.length);
                setDeliveries(data || []);
            } else {
                console.error('[DeliveriesPage] Failed to fetch deliveries:', res.status);
            }
        } catch (error) {
            console.error('[DeliveriesPage] Failed to load deliveries:', error);
        } finally {
            setLoading(false);
        }
    };

    const claimDelivery = async (deliveryId: string) => {
        try {
            console.log('[DeliveriesPage] Claiming delivery:', deliveryId);
            const res = await fetch(`/api/deliveries/${deliveryId}/claim`, {
                method: 'POST',
            });
            if (res.ok) {
                console.log('[DeliveriesPage] Delivery claimed successfully');
                await loadDeliveries();
            } else {
                const error = await res.json().catch(() => ({ error: 'Unknown error' }));
                console.error('[DeliveriesPage] Failed to claim delivery:', error);
                alert(error.error || 'Failed to claim delivery');
            }
        } catch (error) {
            console.error('[DeliveriesPage] Network error claiming delivery:', error);
            alert('Network error');
        }
    };

    const updateDeliveryStatus = async (deliveryId: string, status: string) => {
        try {
            console.log('[DeliveriesPage] Updating delivery status:', deliveryId, 'to', status);
            const res = await fetch(`/api/deliveries/${deliveryId}/status`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status }),
            });
            if (res.ok) {
                console.log('[DeliveriesPage] Status updated successfully');
                await loadDeliveries();
            } else {
                const error = await res.json().catch(() => ({ error: 'Unknown error' }));
                console.error('[DeliveriesPage] Failed to update status:', error);
                alert(error.error || 'Failed to update status');
            }
        } catch (error) {
            console.error('[DeliveriesPage] Network error updating status:', error);
            alert('Network error');
        }
    };

    const statusColors: Record<string, string> = {
        pending: 'bg-yellow-500/10 border border-yellow-500/20 text-yellow-400',
        assigned: 'bg-blue-500/10 border border-blue-500/20 text-blue-400',
        in_transit: 'bg-cyan-500/10 border border-cyan-500/20 text-cyan-400',
        delivered: 'bg-green-500/10 border border-green-500/20 text-green-400',
        cancelled: 'bg-red-500/10 border border-red-500/20 text-red-400',
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
                        <h1 className="text-xl font-bold">Deliveries</h1>
                        <p className="text-sm text-gray-400">Manage delivery orders</p>
                    </div>
                </div>
            </header>

            <div className="p-6">
                {/* Tabs */}
                <div className="flex gap-4 mb-8">
                    <button
                        onClick={() => setActiveTab('pending')}
                        className={`px-4 py-2 rounded-lg font-medium transition-colors ${activeTab === 'pending'
                            ? 'bg-cyan-600 text-white'
                            : 'bg-gray-800 text-gray-400 hover:text-white'
                            }`}
                    >
                        Pending ({pendingDeliveries.length})
                    </button>
                    <button
                        onClick={() => setActiveTab('active')}
                        className={`px-4 py-2 rounded-lg font-medium transition-colors ${activeTab === 'active'
                            ? 'bg-cyan-600 text-white'
                            : 'bg-gray-800 text-gray-400 hover:text-white'
                            }`}
                    >
                        My Active ({myDeliveries.length})
                    </button>
                    <button
                        onClick={() => setActiveTab('history')}
                        className={`px-4 py-2 rounded-lg font-medium transition-colors ${activeTab === 'history'
                            ? 'bg-cyan-600 text-white'
                            : 'bg-gray-800 text-gray-400 hover:text-white'
                            }`}
                    >
                        History ({historyDeliveries.length})
                    </button>
                </div>

                <div className="grid gap-6">
                    {activeTab === 'pending' ? (
                        pendingDeliveries.length === 0 ? (
                            <div className="bg-gray-800 rounded-xl border border-gray-700 p-12 text-center text-gray-400">
                                <p className="text-lg">No pending deliveries</p>
                            </div>
                        ) : (
                            pendingDeliveries.map((delivery) => (
                                <div key={delivery.id} className="bg-gray-800 rounded-xl border border-gray-700 p-6">
                                    <div className="flex justify-between items-start mb-4">
                                        <div>
                                            <p className="text-sm text-gray-400">Order #{delivery.id.slice(0, 8)}</p>
                                            <p className="text-lg font-medium">{delivery.pickup_address || 'Pickup location'}</p>
                                            <p className="text-gray-400">→ {delivery.dropoff_address || 'Dropoff location'}</p>
                                        </div>
                                        <button
                                            onClick={() => claimDelivery(delivery.id)}
                                            className="px-6 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg font-medium transition-colors"
                                        >
                                            Claim Order
                                        </button>
                                    </div>
                                    <div className="text-sm text-gray-500">
                                        {delivery.package_description && <p>📦 {delivery.package_description}</p>}
                                        <p>👤 {delivery.sender_name} • 📱 {delivery.sender_phone}</p>
                                    </div>
                                </div>
                            ))
                        )
                    ) : activeTab === 'active' ? (
                        myDeliveries.length === 0 ? (
                            <div className="bg-gray-800 rounded-xl border border-gray-700 p-12 text-center text-gray-400">
                                <p className="text-lg">No active deliveries</p>
                            </div>
                        ) : (
                            myDeliveries.map((delivery) => (
                                <Link key={delivery.id} href={`/delivery/${delivery.id}`} className="block bg-gray-800 rounded-xl border border-gray-700 p-6 hover:border-cyan-500/50 transition-all cursor-pointer group">
                                    <div className="flex justify-between items-start mb-4">
                                        <div>
                                            <p className="text-sm text-gray-500 group-hover:text-cyan-400 transition-colors">Order #{delivery.id.slice(0, 8)}</p>
                                            <p className="text-lg font-medium">{delivery.pickup_address || 'Pickup location'}</p>
                                            <p className="text-gray-400">→ {delivery.dropoff_address || 'Dropoff location'}</p>
                                        </div>
                                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusColors[delivery.status]}`}>
                                            {delivery.status.replace('_', ' ').charAt(0).toUpperCase() + delivery.status.replace('_', ' ').slice(1)}
                                        </span>
                                    </div>
                                    {delivery.drone_id && (
                                        <div className="mb-4 inline-flex items-center gap-2 px-3 py-1 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                                            <span className="text-xs font-bold text-blue-400 uppercase tracking-widest">🚁 Assigned Drone: Drone-01</span>
                                        </div>
                                    )}
                                    <div className="flex gap-4 text-sm text-gray-400 mb-4">
                                        <span>🔐 PIN: <span className="font-mono text-white">{delivery.pin}</span></span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3 mt-4" onClick={(e) => e.preventDefault()}>
                                        {delivery.status === 'assigned' && (
                                            <button
                                                onClick={(e) => { e.stopPropagation(); updateDeliveryStatus(delivery.id, 'in_transit'); }}
                                                className="py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium transition-colors"
                                            >
                                                Start Transit
                                            </button>
                                        )}
                                        {delivery.status === 'in_transit' && (
                                            <button
                                                onClick={(e) => { e.stopPropagation(); updateDeliveryStatus(delivery.id, 'delivered'); }}
                                                className="py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg font-medium transition-colors"
                                            >
                                                Mark Delivered
                                            </button>
                                        )}
                                        {delivery.drone_id && (
                                            <Link
                                                href={`/control/${delivery.drone_id}`}
                                                className="py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg font-medium transition-colors text-center"
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                Control Drone
                                            </Link>
                                        )}
                                    </div>
                                </Link>
                            ))
                        )
                    ) : (
                        historyDeliveries.length === 0 ? (
                            <div className="bg-gray-800 rounded-xl border border-gray-700 p-12 text-center text-gray-400">
                                <p className="text-lg">No delivery history</p>
                            </div>
                        ) : (
                            historyDeliveries.map((delivery) => (
                                <Link key={delivery.id} href={`/delivery/${delivery.id}`} className="block bg-gray-800 rounded-xl border border-gray-700 p-6 hover:border-gray-600 transition-all cursor-pointer group">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <p className="text-sm text-gray-500 group-hover:text-cyan-400 transition-colors">Order #{delivery.id.slice(0, 8)}</p>
                                            <p className="text-lg font-medium">{delivery.pickup_address || 'Pickup location'}</p>
                                            <p className="text-gray-400">→ {delivery.dropoff_address || 'Dropoff location'}</p>
                                            <p className="text-xs text-gray-500 mt-2">Delivered on {new Date(delivery.updated_at).toLocaleString()}</p>
                                        </div>
                                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusColors[delivery.status]}`}>
                                            {delivery.status.replace('_', ' ').charAt(0).toUpperCase() + delivery.status.replace('_', ' ').slice(1)}
                                        </span>
                                    </div>
                                </Link>
                            ))
                        )
                    )}
                </div>
            </div>
        </div>
    );
}
