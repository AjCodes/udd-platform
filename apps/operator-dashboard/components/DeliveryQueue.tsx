'use client';

import { useEffect, useState } from 'react';
import { createBrowserClient } from '@shared/supabase';
import type { Delivery, Drone } from '@shared/types';

export default function DeliveryQueue() {
    const [deliveries, setDeliveries] = useState<Delivery[]>([]);
    const [drones, setDrones] = useState<Drone[]>([]);
    const [loading, setLoading] = useState(true);
    const [claiming, setClaiming] = useState<string | null>(null);

    const supabase = createBrowserClient();

    useEffect(() => {
        const fetchData = async () => {
            // Get pending deliveries
            const { data: deliveriesData } = await supabase
                .from('deliveries')
                .select('*')
                .eq('status', 'pending')
                .order('created_at', { ascending: true });

            // Get idle drones
            const { data: dronesData } = await supabase
                .from('drones')
                .select('*')
                .eq('status', 'idle');

            setDeliveries(deliveriesData || []);
            setDrones(dronesData || []);
            setLoading(false);
        };

        fetchData();

        // Subscribe to changes
        const subscription = supabase
            .channel('delivery-updates')
            .on('postgres_changes', { event: '*', table: 'deliveries' }, fetchData)
            .on('postgres_changes', { event: '*', table: 'drones' }, fetchData)
            .subscribe();

        return () => {
            subscription.unsubscribe();
        };
    }, []);

    const handleClaim = async (deliveryId: string) => {
        if (drones.length === 0) {
            alert('No idle drones available!');
            return;
        }

        setClaiming(deliveryId);

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not authenticated');

            const droneId = drones[0].id; // Just pick the first idle drone for now

            const { error } = await supabase
                .from('deliveries')
                .update({
                    operator_id: user.id,
                    drone_id: droneId,
                    status: 'assigned',
                    updated_at: new Date().toISOString(),
                })
                .eq('id', deliveryId);

            if (error) throw error;

            // Also update drone status
            await supabase
                .from('drones')
                .update({ status: 'flying' })
                .eq('id', droneId);

        } catch (err) {
            console.error('Failed to claim delivery:', err);
            alert('Failed to claim delivery');
        } finally {
            setClaiming(null);
        }
    };

    if (loading) return <div>Loading queue...</div>;

    return (
        <div className="bg-white rounded-xl shadow-sm border border-zinc-200 overflow-hidden">
            <div className="p-4 border-b border-zinc-100 bg-zinc-50/50 flex justify-between items-center">
                <h2 className="font-semibold text-zinc-900 text-lg">New Requests</h2>
                <span className="px-2 py-0.5 bg-sky-100 text-sky-700 text-xs font-bold rounded-full">
                    {deliveries.length} PENDING
                </span>
            </div>

            <div className="divide-y divide-zinc-100">
                {deliveries.length === 0 ? (
                    <div className="p-8 text-center text-zinc-500 italic">
                        No pending requests at the moment.
                    </div>
                ) : (
                    deliveries.map((delivery) => (
                        <div key={delivery.id} className="p-4 hover:bg-zinc-50 transition-colors">
                            <div className="flex justify-between items-start mb-2">
                                <div>
                                    <div className="text-sm font-medium text-zinc-900 mb-1">
                                        {delivery.pickup_address}
                                    </div>
                                    <div className="text-sm text-zinc-500">
                                        → {delivery.dropoff_address}
                                    </div>
                                </div>
                                <div className="text-xs text-zinc-400">
                                    {new Date(delivery.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </div>
                            </div>

                            {delivery.package_description && (
                                <p className="text-sm text-zinc-500 mb-3 line-clamp-1 italic">
                                    "{delivery.package_description}"
                                </p>
                            )}

                            <button
                                onClick={() => handleClaim(delivery.id)}
                                disabled={claiming === delivery.id || drones.length === 0}
                                className="w-full py-2 bg-sky-600 text-white rounded-lg text-sm font-medium hover:bg-sky-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                {claiming === delivery.id ? 'Claiming...' : 'Claim & Assign Drone'}
                            </button>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
