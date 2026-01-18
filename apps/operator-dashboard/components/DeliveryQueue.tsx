'use client';

import { useEffect, useState } from 'react';
import { createBrowserClient } from '@udd/shared';
import type { Delivery, Drone } from '@udd/shared';
import Link from 'next/link';

export default function DeliveryQueue() {
    const [deliveries, setDeliveries] = useState<Delivery[]>([]);
    const [loading, setLoading] = useState(true);

    const supabase = createBrowserClient();

    const fetchDeliveries = async () => {
        try {
            // Fetch through API (uses service role key, bypasses RLS)
            const res = await fetch('/api/deliveries', { cache: 'no-store' });
            if (res.ok) {
                const data = await res.json();
                console.log('[DeliveryQueue] Raw deliveries from API:', data.length);

                // Filter to only show active deliveries (exclude delivered and cancelled)
                const activeDeliveries = data.filter((d: Delivery) =>
                    ['pending', 'assigned', 'in_transit'].includes(d.status)
                ).slice(0, 10);

                console.log('[DeliveryQueue] Active deliveries after filter:', activeDeliveries.length);
                if (activeDeliveries.length > 0) {
                    console.log('[DeliveryQueue] Showing deliveries:', activeDeliveries.map((d: any) => ({
                        id: d.id.slice(0, 8),
                        status: d.status,
                        created_at: d.created_at
                    })));
                }

                setDeliveries(activeDeliveries);
            } else {
                const errorText = await res.text();
                console.error('[DeliveryQueue] Failed to fetch deliveries:', res.status, res.statusText, errorText);
            }
        } catch (error) {
            console.error('[DeliveryQueue] Fetch error:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDeliveries();

        // Subscribe to changes - refetch from API when changes occur
        const subscription = supabase
            .channel('delivery-queue-updates')
            // @ts-ignore
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'deliveries'
            }, (payload: any) => {
                console.log('[DeliveryQueue] Real-time update:', payload.eventType, payload.new?.id);
                fetchDeliveries();
            })
            .subscribe((status) => {
                console.log('[DeliveryQueue] Subscription status:', status);
                if (status === 'SUBSCRIBED') {
                    console.log('[DeliveryQueue] Successfully subscribed to real-time updates');
                }
            });

        // Poll every 1 second as backup (real-time might not work without proper RLS)
        const interval = setInterval(() => {
            fetchDeliveries();
        }, 1000);

        // Refresh when window gains focus
        const handleFocus = () => {
            console.log('[DeliveryQueue] Window focused, refreshing');
            fetchDeliveries();
        };
        window.addEventListener('focus', handleFocus);

        return () => {
            subscription.unsubscribe();
            clearInterval(interval);
            window.removeEventListener('focus', handleFocus);
        };
    }, []);

    if (loading) return <div className="p-4 text-center text-zinc-400">Loading feed...</div>;

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'pending': return 'bg-yellow-500/20 text-yellow-500';
            case 'assigned': return 'bg-blue-500/20 text-blue-500';
            case 'in_transit': return 'bg-sky-500/20 text-sky-500';
            case 'delivered': return 'bg-green-500/20 text-green-500';
            default: return 'bg-gray-700 text-gray-400';
        }
    };

    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'pending': return 'Waiting for Drone';
            case 'assigned': return 'Drone Assigned';
            case 'in_transit': return 'Flying to Destination';
            case 'delivered': return 'Delivered';
            default: return status;
        }
    };

    return (
        <div className="bg-gray-800 rounded-xl shadow-sm border border-gray-700 overflow-hidden h-full flex flex-col">
            <div className="p-4 border-b border-gray-700 bg-gray-900/50 flex justify-between items-center">
                <h2 className="font-semibold text-white text-lg">Live Delivery Feed</h2>
                <span className="px-2 py-0.5 bg-gray-700 text-gray-400 text-xs font-bold rounded-full">
                    {deliveries.length} ACTIVE
                </span>
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-gray-700">
                {deliveries.length === 0 ? (
                    <div className="p-8 text-center text-gray-400 italic flex flex-col items-center gap-2">
                        <div className="text-2xl">📦</div>
                        <div>No active deliveries.</div>
                        <div className="text-xs text-gray-500">New orders will appear here automatically.</div>
                    </div>
                ) : (
                    deliveries.map((delivery) => (
                        <Link
                            key={delivery.id}
                            href={`/delivery/${delivery.id}`}
                            className="block p-4 hover:bg-gray-700/50 transition-colors cursor-pointer"
                        >
                            <div className="flex justify-between items-start mb-2">
                                <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${getStatusColor(delivery.status)}`}>
                                    {getStatusLabel(delivery.status)}
                                </span>
                                <div className="text-xs text-gray-500">
                                    {new Date(delivery.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </div>
                            </div>

                            <div className="flex justify-between items-start mb-1">
                                <div>
                                    <div className="text-sm font-bold text-white">
                                        {(delivery.pickup_address || 'Unknown').split(',')[0]}
                                    </div>
                                    <div className="text-sm text-gray-400 flex items-center gap-1">
                                        <span>↓</span>
                                        {(delivery.dropoff_address || 'Unknown').split(',')[0]}
                                    </div>
                                </div>
                                <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                            </div>

                            {delivery.status === 'in_transit' && (
                                <div className="mt-2 w-full bg-gray-900 rounded-full h-1.5 overflow-hidden">
                                    <div className="bg-sky-500 h-full rounded-full animate-pulse" style={{ width: '60%' }}></div>
                                </div>
                            )}
                        </Link>
                    ))
                )}
            </div>
        </div>
    );
}
