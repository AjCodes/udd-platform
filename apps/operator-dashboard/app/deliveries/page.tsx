'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { Delivery } from '@udd/shared';

export default function DeliveriesPage() {
    const [deliveries, setDeliveries] = useState<Delivery[]>([]);
    const [myDeliveries, setMyDeliveries] = useState<Delivery[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'pending' | 'active'>('pending');

    useEffect(() => {
        loadDeliveries();
        // Poll every 2 seconds to ensure updates are seen quickly
        const interval = setInterval(loadDeliveries, 2000);
        return () => clearInterval(interval);
    }, []);

    const loadDeliveries = async () => {
        try {
            // Fetch pending deliveries
            const pendingRes = await fetch('/api/deliveries/available', { cache: 'no-store' });
            if (pendingRes.ok) {
                const data = await pendingRes.json();
                console.log('[DeliveriesPage] Pending deliveries loaded:', data.length);
                setDeliveries(data || []);
            } else {
                const errorData = await pendingRes.json().catch(() => ({}));
                console.error('[DeliveriesPage] Failed to fetch pending deliveries:', pendingRes.status, errorData);
            }

            // Fetch my active deliveries
            const activeRes = await fetch('/api/deliveries/my-active', { cache: 'no-store' });
            if (activeRes.ok) {
                const data = await activeRes.json();
                console.log('[DeliveriesPage] Active deliveries loaded:', data.length);
                setMyDeliveries(data || []);
            } else {
                const errorData = await activeRes.json().catch(() => ({}));
                console.error('[DeliveriesPage] Failed to fetch active deliveries:', activeRes.status, errorData);
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
        pending: 'bg-yellow-500/20 text-yellow-400',
        assigned: 'bg-blue-500/20 text-blue-400',
        in_transit: 'bg-cyan-500/20 text-cyan-400',
        delivered: 'bg-green-500/20 text-green-400',
        cancelled: 'bg-gray-500/20 text-gray-400',
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
                <div className="flex gap-2 mb-6">
                    <button
                        onClick={() => setActiveTab('pending')}
                        className={`px-4 py-2 rounded-lg font-medium transition-colors ${activeTab === 'pending'
                                ? 'bg-cyan-600 text-white'
                                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                            }`}
                    >
                        Pending ({deliveries.length})
                    </button>
                    <button
                        onClick={() => setActiveTab('active')}
                        className={`px-4 py-2 rounded-lg font-medium transition-colors ${activeTab === 'active'
                                ? 'bg-cyan-600 text-white'
                                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                            }`}
                    >
                        My Active ({myDeliveries.length})
                    </button>
                </div>

                {/* Pending Deliveries */}
                {activeTab === 'pending' && (
                    <div className="grid gap-4">
                        {deliveries.length === 0 ? (
                            <div className="bg-gray-800 rounded-xl border border-gray-700 p-8 text-center">
                                <svg className="w-16 h-16 mx-auto mb-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                                </svg>
                                <p className="text-gray-400">No pending deliveries</p>
                                <p className="text-sm text-gray-500">Waiting for new orders...</p>
                            </div>
                        ) : (
                            deliveries.map((delivery) => (
                                <div key={delivery.id} className="bg-gray-800 rounded-xl border border-gray-700 p-6">
                                    <div className="flex justify-between items-start mb-4">
                                        <div>
                                            <p className="text-sm text-gray-400">Order #{delivery.id.slice(0, 8)}</p>
                                            <p className="text-lg font-medium">{delivery.pickup_address || 'Pickup location'}</p>
                                            <p className="text-gray-400">→ {delivery.dropoff_address || 'Dropoff location'}</p>
                                        </div>
                                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusColors[delivery.status]}`}>
                                            Pending
                                        </span>
                                    </div>
                                    {delivery.package_description && (
                                        <p className="text-sm text-gray-400 mb-4">{delivery.package_description}</p>
                                    )}
                                    <div className="flex gap-4 text-sm text-gray-400 mb-4">
                                        <span>📍 {delivery.pickup_lat.toFixed(4)}, {delivery.pickup_lng.toFixed(4)}</span>
                                        <span>🎯 {delivery.dropoff_lat.toFixed(4)}, {delivery.dropoff_lng.toFixed(4)}</span>
                                    </div>
                                    <button
                                        onClick={() => claimDelivery(delivery.id)}
                                        className="w-full py-3 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg font-medium transition-colors"
                                    >
                                        Claim Delivery
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                )}

                {/* My Active Deliveries */}
                {activeTab === 'active' && (
                    <div className="grid gap-4">
                        {myDeliveries.length === 0 ? (
                            <div className="bg-gray-800 rounded-xl border border-gray-700 p-8 text-center">
                                <svg className="w-16 h-16 mx-auto mb-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                                </svg>
                                <p className="text-gray-400">No active deliveries</p>
                                <p className="text-sm text-gray-500">Claim a delivery to get started</p>
                            </div>
                        ) : (
                            myDeliveries.map((delivery) => (
                                <div key={delivery.id} className="bg-gray-800 rounded-xl border border-gray-700 p-6">
                                    <div className="flex justify-between items-start mb-4">
                                        <div>
                                            <p className="text-sm text-gray-400">Order #{delivery.id.slice(0, 8)}</p>
                                            <p className="text-lg font-medium">{delivery.pickup_address || 'Pickup location'}</p>
                                            <p className="text-gray-400">→ {delivery.dropoff_address || 'Dropoff location'}</p>
                                        </div>
                                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusColors[delivery.status]}`}>
                                            {delivery.status.replace('_', ' ').charAt(0).toUpperCase() + delivery.status.replace('_', ' ').slice(1)}
                                        </span>
                                    </div>
                                    {delivery.package_description && (
                                        <p className="text-sm text-gray-400 mb-4">{delivery.package_description}</p>
                                    )}
                                    <div className="flex gap-4 text-sm text-gray-400 mb-4">
                                        <span>🔐 PIN: <span className="font-mono text-white">{delivery.pin}</span></span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        {delivery.status === 'assigned' && (
                                            <button
                                                onClick={() => updateDeliveryStatus(delivery.id, 'in_transit')}
                                                className="py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium transition-colors"
                                            >
                                                Start Transit
                                            </button>
                                        )}
                                        {delivery.status === 'in_transit' && (
                                            <button
                                                onClick={() => updateDeliveryStatus(delivery.id, 'delivered')}
                                                className="py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg font-medium transition-colors"
                                            >
                                                Mark Delivered
                                            </button>
                                        )}
                                        {delivery.drone_id && (
                                            <Link
                                                href={`/control/${delivery.drone_id}`}
                                                className="py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg font-medium transition-colors text-center"
                                            >
                                                Control Drone
                                            </Link>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
