'use client';

import type { Delivery } from '@udd/shared';
import Link from 'next/link';

interface DeliveryQueueProps {
    deliveries: Delivery[];
}

export default function DeliveryQueue({ deliveries = [] }: DeliveryQueueProps) {
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
                                    {new Date(delivery.updated_at || delivery.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
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
                                    {(delivery as any).drones?.name && (
                                        <div className="text-[10px] mt-1 text-blue-400 flex items-center gap-1 font-medium bg-blue-500/10 px-1.5 py-0.5 rounded-md w-fit">
                                            <span className="text-[8px]">🛸</span> {(delivery as any).drones.name}
                                        </div>
                                    )}
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
