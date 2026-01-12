'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { createBrowserClient } from '@shared/supabase';
import type { Delivery } from '@shared/types';

export default function DeliveryTrackingPage() {
    const router = useRouter();
    const params = useParams();
    const [delivery, setDelivery] = useState<Delivery | null>(null);
    const [loading, setLoading] = useState(true);
    const [dronePosition, setDronePosition] = useState({ lat: 51.4416, lng: 5.4697 });

    useEffect(() => {
        const loadDelivery = async () => {
            const supabase = createBrowserClient();

            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                router.push('/login');
                return;
            }

            const { data } = await supabase
                .from('deliveries')
                .select('*')
                .eq('id', params.id)
                .single();

            if (data) {
                setDelivery(data);
                // Start at pickup location
                setDronePosition({ lat: data.pickup_lat, lng: data.pickup_lng });
            }
            setLoading(false);
        };

        loadDelivery();

        // Simulate drone movement
        const interval = setInterval(() => {
            setDronePosition(prev => ({
                lat: prev.lat + (Math.random() - 0.5) * 0.001,
                lng: prev.lng + (Math.random() - 0.5) * 0.001,
            }));
        }, 2000);

        return () => clearInterval(interval);
    }, [params.id, router]);

    const handleShare = async () => {
        if (!delivery) return;

        const shareData = {
            title: 'UDD Delivery PIN',
            text: `Your drone delivery PIN is: ${delivery.pin}. Use this to unlock the storage compartment.`,
        };

        if (navigator.share) {
            await navigator.share(shareData);
        } else {
            await navigator.clipboard.writeText(shareData.text);
            alert('PIN copied to clipboard!');
        }
    };

    const handleUnlock = async () => {
        if (!delivery) return;

        const supabase = createBrowserClient();
        await supabase
            .from('deliveries')
            .update({ status: 'delivered', updated_at: new Date().toISOString() })
            .eq('id', delivery.id);

        alert('Storage compartment unlocked!');
        router.push('/dashboard');
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-500"></div>
            </div>
        );
    }

    if (!delivery) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <p>Delivery not found</p>
            </div>
        );
    }

    const statusColors: Record<string, string> = {
        pending: 'text-yellow-500',
        assigned: 'text-blue-500',
        in_transit: 'text-sky-500',
        delivered: 'text-green-500',
    };

    return (
        <div className="min-h-screen flex flex-col">
            {/* Header */}
            <div className="bg-white border-b px-4 py-4 flex items-center">
                <button onClick={() => router.back()} className="mr-4">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                </button>
                <h1 className="text-xl font-semibold">Track Delivery</h1>
            </div>

            {/* Map placeholder */}
            <div className="flex-1 bg-gray-200 relative">
                <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-sky-100 to-sky-200">
                    {/* Simulated map with drone */}
                    <div className="text-center">
                        <div className="text-4xl mb-2">🚁</div>
                        <p className="text-sm text-gray-600">
                            Lat: {dronePosition.lat.toFixed(4)}, Lng: {dronePosition.lng.toFixed(4)}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                            (Map integration coming soon)
                        </p>
                    </div>
                </div>

                {/* Route markers */}
                <div className="absolute top-4 left-4 space-y-2">
                    <div className="bg-white rounded-lg shadow px-3 py-2 text-sm flex items-center gap-2">
                        <span className="w-4 h-4 bg-green-500 rounded-full"></span>
                        {delivery.pickup_address || 'Pickup'}
                    </div>
                    <div className="bg-white rounded-lg shadow px-3 py-2 text-sm flex items-center gap-2">
                        <span className="w-4 h-4 bg-red-500 rounded-full"></span>
                        {delivery.dropoff_address || 'Dropoff'}
                    </div>
                </div>
            </div>

            {/* Status card */}
            <div className="bg-white border-t rounded-t-3xl -mt-6 relative z-10 p-4 pb-8">
                <div className="w-12 h-1 bg-gray-300 rounded-full mx-auto mb-4"></div>

                <div className="flex justify-between items-center mb-4">
                    <div>
                        <p className={`text-lg font-semibold ${statusColors[delivery.status]}`}>
                            {delivery.status === 'in_transit' ? 'In Transit' :
                                delivery.status.charAt(0).toUpperCase() + delivery.status.slice(1)}
                        </p>
                        <p className="text-gray-500 text-sm">Order #{delivery.id.slice(0, 8)}</p>
                    </div>
                    <div className="text-right">
                        <p className="text-sm text-gray-500">Battery</p>
                        <p className="font-semibold">85%</p>
                    </div>
                </div>

                {/* PIN section */}
                <div className="bg-sky-50 rounded-xl p-4 flex items-center justify-between mb-4">
                    <div>
                        <p className="text-sm text-sky-600 font-medium">PIN</p>
                        <p className="text-2xl font-bold text-sky-700 font-mono">{delivery.pin}</p>
                    </div>
                    <button
                        onClick={handleShare}
                        className="btn-secondary px-4 py-2 flex items-center gap-2"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                        </svg>
                        Share
                    </button>
                </div>

                {/* Unlock button - only show if in_transit */}
                {delivery.status === 'in_transit' && (
                    <button
                        onClick={handleUnlock}
                        className="btn-primary w-full"
                    >
                        Unlock Compartment
                    </button>
                )}
            </div>
        </div>
    );
}
