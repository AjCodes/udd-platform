'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@udd/shared';
import type { Delivery } from '@udd/shared';
import BottomNav from '@/components/BottomNav';

export default function HistoryPage() {
    const router = useRouter();
    const [deliveries, setDeliveries] = useState<Delivery[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all');

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
                .order('created_at', { ascending: false });

            setDeliveries(data || []);
            setLoading(false);
        };

        loadHistory();
    }, [router]);

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'pending': return { bg: 'bg-yellow-100', text: 'text-yellow-700' };
            case 'assigned': return { bg: 'bg-blue-100', text: 'text-blue-700' };
            case 'in_transit': return { bg: 'bg-purple-100', text: 'text-purple-700' };
            case 'delivered': return { bg: 'bg-green-100', text: 'text-green-700' };
            case 'cancelled': return { bg: 'bg-gray-100', text: 'text-gray-500' };
            default: return { bg: 'bg-gray-100', text: 'text-gray-500' };
        }
    };

    const _getStatusEmoji = (status: string) => {
        switch (status) {
            case 'pending': return '⏳';
            case 'assigned': return '🚁';
            case 'in_transit': return '✈️';
            case 'delivered': return '✅';
            case 'cancelled': return '❌';
            default: return '📦';
        }
    };

    const filteredDeliveries = deliveries.filter(d => {
        if (filter === 'all') return true;
        if (filter === 'active') return ['pending', 'assigned', 'in_transit'].includes(d.status);
        if (filter === 'completed') return ['delivered', 'cancelled'].includes(d.status);
        return true;
    });

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--bg)' }}>
                <div className="animate-spin rounded-full h-10 w-10 border-b-2" style={{ borderColor: 'var(--primary)' }}></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen pb-24" style={{ backgroundColor: 'var(--bg)' }}>
            {/* Header */}
            <div className="bg-white border-b px-5 py-5">
                <h1 className="text-xl font-semibold mb-4">My Deliveries</h1>

                {/* Filter tabs */}
                <div className="flex gap-2">
                    {(['all', 'active', 'completed'] as const).map((f) => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${filter === f
                                ? 'text-white'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                }`}
                            style={filter === f ? { backgroundColor: 'var(--primary)' } : {}}
                        >
                            {f.charAt(0).toUpperCase() + f.slice(1)}
                            {f === 'active' && deliveries.filter(d => ['pending', 'assigned', 'in_transit'].includes(d.status)).length > 0 && (
                                <span className="ml-2 px-2 py-0.5 rounded-full text-xs bg-white text-teal-600">
                                    {deliveries.filter(d => ['pending', 'assigned', 'in_transit'].includes(d.status)).length}
                                </span>
                            )}
                        </button>
                    ))}
                </div>
            </div>

            {/* Deliveries list */}
            <div className="p-4">
                {filteredDeliveries.length === 0 ? (
                    <div className="card text-center py-12">
                        <div className="text-5xl mb-4">
                            {filter === 'active' ? '🚁' : filter === 'completed' ? '📦' : '📭'}
                        </div>
                        <p className="text-gray-500 text-lg">
                            {filter === 'active'
                                ? 'No active deliveries'
                                : filter === 'completed'
                                    ? 'No completed deliveries yet'
                                    : 'No deliveries yet'}
                        </p>
                        <button
                            onClick={() => router.push('/new-delivery')}
                            className="btn-primary mt-4"
                        >
                            Request a Delivery
                        </button>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {filteredDeliveries.map((delivery) => {
                            const statusStyle = getStatusColor(delivery.status);
                            const isActive = ['pending', 'assigned', 'in_transit'].includes(delivery.status);

                            return (
                                <button
                                    key={delivery.id}
                                    onClick={() => router.push(`/delivery/${delivery.id}`)}
                                    className="card w-full text-left hover:shadow-md transition-shadow"
                                    style={isActive ? { borderLeft: '4px solid var(--primary)' } : {}}
                                >
                                    <div className="flex justify-between items-start mb-3">
                                        <div className="flex items-center gap-2">
                                            <div>
                                                <p className="font-semibold text-gray-900">
                                                    {delivery.pickup_address?.split(',')[0] || 'Pickup'}
                                                </p>
                                                <p className="text-sm text-gray-500">
                                                    → {delivery.dropoff_address?.split(',')[0] || 'Dropoff'}
                                                </p>
                                            </div>
                                        </div>
                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusStyle.bg} ${statusStyle.text}`}>
                                            {delivery.status.replace('_', ' ').toUpperCase()}
                                        </span>
                                    </div>

                                    <div className="flex justify-between items-center text-sm text-gray-500">
                                        <span>
                                            {new Date(delivery.created_at).toLocaleDateString('en-US', {
                                                month: 'short',
                                                day: 'numeric',
                                                hour: '2-digit',
                                                minute: '2-digit',
                                            })}
                                        </span>
                                        {isActive && (
                                            <span className="flex items-center gap-1 font-medium" style={{ color: 'var(--primary)' }}>
                                                Track
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                                </svg>
                                            </span>
                                        )}
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                )}
            </div>

            <BottomNav />
        </div>
    );
}
