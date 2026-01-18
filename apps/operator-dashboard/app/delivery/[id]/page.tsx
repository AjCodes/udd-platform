'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import type { Delivery, Drone } from '@udd/shared';

interface DeliveryWithDrone extends Delivery {
    drone?: Drone;
}

export default function DeliveryDetailPage() {
    const params = useParams();
    const [delivery, setDelivery] = useState<DeliveryWithDrone | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadDelivery();
        const interval = setInterval(loadDelivery, 2000); // Poll for updates
        return () => clearInterval(interval);
    }, [params.id]);

    const loadDelivery = async () => {
        try {
            // Fetch delivery
            const res = await fetch('/api/deliveries');
            if (res.ok) {
                const deliveries = await res.json();
                const found = deliveries.find((d: Delivery) => d.id === params.id);
                if (found) {
                    // If delivery has a drone, fetch drone info
                    if (found.drone_id) {
                        const droneRes = await fetch('/api/drones');
                        if (droneRes.ok) {
                            const drones = await droneRes.json();
                            const drone = drones.find((d: Drone) => d.id === found.drone_id);
                            found.drone = drone;
                        }
                    }
                    setDelivery(found);
                }
            }
        } catch (error) {
            console.error('Failed to load delivery:', error);
        } finally {
            setLoading(false);
        }
    };

    const getStatusInfo = (status: string) => {
        switch (status) {
            case 'pending':
                return { label: 'Pending', color: 'bg-yellow-500', icon: '⏳', description: 'Waiting for drone assignment' };
            case 'assigned':
                return { label: 'Drone Assigned', color: 'bg-blue-500', icon: '📍', description: 'Drone is flying to pickup location' };
            case 'in_transit':
                return { label: 'In Transit', color: 'bg-cyan-500', icon: '📦', description: 'Package picked up, flying to destination' };
            case 'delivered':
                return { label: 'Delivered', color: 'bg-green-500', icon: '✅', description: 'Package successfully delivered' };
            case 'cancelled':
                return { label: 'Cancelled', color: 'bg-gray-500', icon: '❌', description: 'Delivery was cancelled' };
            default:
                return { label: status, color: 'bg-gray-500', icon: '❓', description: '' };
        }
    };

    const getProgressSteps = () => {
        const steps = [
            { status: 'pending', label: 'Order Received', icon: '📝' },
            { status: 'assigned', label: 'Drone Assigned', icon: '📍' },
            { status: 'in_transit', label: 'In Transit', icon: '📦' },
            { status: 'delivered', label: 'Delivered', icon: '✅' },
        ];

        const currentIndex = steps.findIndex(s => s.status === delivery?.status);
        return steps.map((step, index) => ({
            ...step,
            completed: index <= currentIndex,
            current: index === currentIndex,
        }));
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-900">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500"></div>
            </div>
        );
    }

    if (!delivery) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">
                <div className="text-center">
                    <h1 className="text-2xl font-bold mb-4">Delivery not found</h1>
                    <Link href="/dashboard" className="text-cyan-500 hover:underline">
                        Back to Dashboard
                    </Link>
                </div>
            </div>
        );
    }

    const statusInfo = getStatusInfo(delivery.status);
    const progressSteps = getProgressSteps();

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
                        <h1 className="text-xl font-bold">Delivery Details</h1>
                        <p className="text-sm text-gray-400">Order #{delivery.id.slice(0, 8)}</p>
                    </div>
                </div>
            </header>

            <div className="p-6 max-w-4xl mx-auto">
                {/* Status Banner */}
                <div className={`${statusInfo.color} rounded-xl p-6 mb-6`}>
                    <div className="flex items-center gap-4">
                        <span className="text-4xl">{statusInfo.icon}</span>
                        <div>
                            <h2 className="text-2xl font-bold text-white">{statusInfo.label}</h2>
                            <p className="text-white/80">{statusInfo.description}</p>
                        </div>
                    </div>
                </div>

                {/* Progress Timeline */}
                <div className="bg-gray-800 rounded-xl border border-gray-700 p-6 mb-6">
                    <h3 className="text-lg font-semibold mb-6">Delivery Progress</h3>
                    <div className="flex justify-between items-center">
                        {progressSteps.map((step, index) => (
                            <div key={step.status} className="flex flex-col items-center flex-1">
                                <div className={`w-12 h-12 rounded-full flex items-center justify-center text-xl ${step.completed ? 'bg-cyan-500' : 'bg-gray-700'
                                    } ${step.current ? 'ring-4 ring-cyan-500/30' : ''}`}>
                                    {step.icon}
                                </div>
                                <div className={`mt-2 text-sm text-center ${step.completed ? 'text-white' : 'text-gray-500'}`}>
                                    {step.label}
                                </div>
                                {index < progressSteps.length - 1 && (
                                    <div className={`hidden md:block absolute w-full h-1 top-6 left-1/2 -z-10 ${step.completed ? 'bg-cyan-500' : 'bg-gray-700'
                                        }`} />
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                    {/* Delivery Info */}
                    <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
                        <h3 className="text-lg font-semibold mb-4">Delivery Information</h3>

                        <div className="space-y-4">
                            <div>
                                <p className="text-sm text-gray-400">Pickup Location</p>
                                <p className="text-white font-medium">{delivery.pickup_address || 'Unknown'}</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-400">Dropoff Location</p>
                                <p className="text-white font-medium">{delivery.dropoff_address || 'Unknown'}</p>
                            </div>
                            {delivery.package_description && (
                                <div>
                                    <p className="text-sm text-gray-400">Package</p>
                                    <p className="text-white font-medium">{delivery.package_description}</p>
                                </div>
                            )}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-sm text-gray-400">Sender</p>
                                    <p className="text-white font-medium">{delivery.sender_name || '-'}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-400">Receiver</p>
                                    <p className="text-white font-medium">{delivery.receiver_name || '-'}</p>
                                </div>
                            </div>
                            <div>
                                <p className="text-sm text-gray-400">Unlock PIN</p>
                                <p className="text-2xl font-mono font-bold text-cyan-400">{delivery.pin}</p>
                            </div>
                        </div>
                    </div>

                    {/* Drone Info */}
                    <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
                        <h3 className="text-lg font-semibold mb-4">Assigned Drone</h3>

                        {delivery.drone ? (
                            <div className="space-y-4">
                                <div className="flex items-center gap-4">
                                    <div className={`w-16 h-16 rounded-xl flex items-center justify-center ${delivery.drone.status === 'flying' ? 'bg-blue-500' : 'bg-green-500'
                                        }`}>
                                        <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                                        </svg>
                                    </div>
                                    <div>
                                        <p className="text-xl font-bold text-white">{delivery.drone.name}</p>
                                        <p className={`text-sm ${delivery.drone.status === 'flying' ? 'text-blue-400' : 'text-green-400'}`}>
                                            {delivery.drone.status.charAt(0).toUpperCase() + delivery.drone.status.slice(1)}
                                        </p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-sm text-gray-400">Battery</p>
                                        <div className="flex items-center gap-2">
                                            <div className="flex-1 h-2 bg-gray-700 rounded-full overflow-hidden">
                                                <div
                                                    className={`h-full ${delivery.drone.battery_level > 50 ? 'bg-green-500' :
                                                        delivery.drone.battery_level > 20 ? 'bg-yellow-500' : 'bg-red-500'}`}
                                                    style={{ width: `${delivery.drone.battery_level}%` }}
                                                />
                                            </div>
                                            <span className="text-sm font-medium">{delivery.drone.battery_level}%</span>
                                        </div>
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-400">Location</p>
                                        <p className="text-white font-mono text-sm">
                                            {delivery.drone.current_lat?.toFixed(4)}, {delivery.drone.current_lng?.toFixed(4)}
                                        </p>
                                    </div>
                                </div>

                                <Link
                                    href={`/control/${delivery.drone.id}`}
                                    className="block w-full py-3 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg font-medium transition-colors text-center"
                                >
                                    Open Drone Control
                                </Link>
                            </div>
                        ) : (
                            <div className="text-center py-8 text-gray-400">
                                <svg className="w-16 h-16 mx-auto mb-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                                </svg>
                                <p>No drone assigned yet</p>
                                <p className="text-sm text-gray-500">A drone will be assigned shortly</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Timestamps */}
                <div className="bg-gray-800 rounded-xl border border-gray-700 p-6 mt-6">
                    <h3 className="text-lg font-semibold mb-4">Timeline</h3>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                            <p className="text-gray-400">Created</p>
                            <p className="text-white">{new Date(delivery.created_at).toLocaleString()}</p>
                        </div>
                        <div>
                            <p className="text-gray-400">Last Updated</p>
                            <p className="text-white">{new Date(delivery.updated_at).toLocaleString()}</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
