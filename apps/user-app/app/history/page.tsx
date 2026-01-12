'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@shared/supabase';
import type { Delivery } from '@shared/types';
import BottomNav from '@/components/BottomNav';
import DeliveryCard from '@/components/DeliveryCard';

export default function HistoryPage() {
    const router = useRouter();
    const [deliveries, setDeliveries] = useState<Delivery[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadHistory = async () => {
            const supabase = createBrowserClient();

            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                router.push('/login');
                return;
            }

            const { data } = await supabase
                .from('deliveries')
                .select('*')
                .eq('user_id', user.id)
                .in('status', ['delivered', 'cancelled'])
                .order('created_at', { ascending: false });

            setDeliveries(data || []);
            setLoading(false);
        };

        loadHistory();
    }, [router]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-500"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen pb-20">
            {/* Header */}
            <div className="bg-white border-b px-4 py-4">
                <h1 className="text-xl font-semibold">Delivery History</h1>
            </div>

            {/* History list */}
            <div className="p-4">
                {deliveries.length === 0 ? (
                    <div className="card text-center py-12">
                        <div className="text-gray-400 mb-2">
                            <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <p className="text-gray-500">No delivery history yet</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {deliveries.map((delivery) => (
                            <div key={delivery.id} className="card">
                                <div className="flex justify-between items-start mb-2">
                                    <div>
                                        <p className="text-sm text-gray-500">
                                            {new Date(delivery.created_at).toLocaleDateString('en-US', {
                                                month: 'short',
                                                day: 'numeric',
                                                year: 'numeric',
                                            })}
                                        </p>
                                        <p className="font-medium">{delivery.pickup_address || 'Pickup'}</p>
                                        <p className="text-gray-500 text-sm">→ {delivery.dropoff_address || 'Dropoff'}</p>
                                    </div>
                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${delivery.status === 'delivered'
                                            ? 'bg-green-100 text-green-700'
                                            : 'bg-gray-100 text-gray-500'
                                        }`}>
                                        {delivery.status === 'delivered' ? 'Delivered' : 'Cancelled'}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <BottomNav />
        </div>
    );
}
