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

    const updateDeliveryStatus = async (status: string) => {
        if (!delivery) return;
        try {
            const res = await fetch(`/api/deliveries/${delivery.id}/status`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status }),
            });
            if (res.ok) {
                await loadDelivery();
            } else {
                const error = await res.json();
                alert(error.error || 'Failed to update status');
            }
        } catch (error) {
            console.error('Failed to update status:', error);
            alert('Network error');
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
        <div className="min-h-screen bg-gray-900 text-white pb-12">
            {/* Header */}
            <header className="bg-gray-800/50 backdrop-blur-md sticky top-0 z-10 border-b border-gray-700 px-6 py-4">
                <div className="flex items-center gap-4">
                    <Link href="/deliveries" className="text-gray-400 hover:text-white transition-colors bg-gray-800 p-2 rounded-lg">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                    </Link>
                    <div>
                        <h1 className="text-lg font-bold">Delivery Details</h1>
                        <p className="text-xs text-gray-500 font-mono">Order #{delivery.id.slice(0, 8)}</p>
                    </div>
                </div>
            </header>

            <div className="p-6 max-w-5xl mx-auto space-y-6">
                {/* Delivered State High Fidelity Banner (Conditional) */}
                {delivery.status === 'delivered' && (
                    <div className="relative overflow-hidden bg-gray-800/40 backdrop-blur-xl rounded-[2.5rem] p-12 border border-white/10 shadow-2xl flex flex-col items-center justify-center text-center animate-in fade-in zoom-in duration-1000">
                        <style jsx>{`
                            @keyframes checkmark-draw {
                                0% { stroke-dashoffset: 100; opacity: 0; }
                                10% { opacity: 1; }
                                100% { stroke-dashoffset: 0; opacity: 1; }
                            }
                            .animate-checkmark {
                                stroke-dasharray: 100;
                                stroke-dashoffset: 100;
                                animation: checkmark-draw 1.2s cubic-bezier(0.65, 0, 0.45, 1) forwards;
                                animation-delay: 0.2s;
                            }
                        `}</style>

                        {/* Background Mesh Gradients */}
                        <div className="absolute inset-0 -z-10 overflow-hidden">
                            <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-emerald-500/10 rounded-full blur-[100px] animate-pulse" />
                            <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] bg-cyan-500/10 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '1s' }} />
                        </div>

                        <div className="relative mb-8">
                            {/* Outer Glows */}
                            <div className="absolute inset-0 bg-emerald-500/20 rounded-full blur-2xl animate-pulse" />

                            <div className="relative w-32 h-32 bg-gray-900/50 backdrop-blur-md rounded-3xl border border-white/10 shadow-2xl flex items-center justify-center overflow-hidden group">
                                {/* Inner Gradient Polish */}
                                <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />

                                {/* Animated SVG Checkmark */}
                                <svg viewBox="0 0 100 100" className="w-20 h-20 text-emerald-400 relative z-10 drop-shadow-[0_0_15px_rgba(52,211,153,0.5)]">
                                    <path
                                        d="M25 50 L45 70 L75 30"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="10"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        className="animate-checkmark"
                                    />
                                </svg>

                                {/* Success Glow Base */}
                                <div className="absolute inset-0 bg-emerald-500/5" />
                            </div>
                        </div>

                        <h2 className="text-5xl font-black text-white mb-3 tracking-tight bg-gradient-to-b from-white to-white/70 bg-clip-text text-transparent">
                            Delivered!
                        </h2>
                        <p className="text-xl text-gray-400 font-medium tracking-wide">
                            Package reached its destination successfully
                        </p>
                    </div>
                )}

                {/* Status Banner (Small version when not delivered) */}
                {delivery.status !== 'delivered' && (
                    <div className={`${statusInfo.color} rounded-2xl p-6 shadow-lg shadow-${statusInfo.color.split('-')[1]}-500/10 border border-white/10`}>
                        <div className="flex items-center gap-6">
                            <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center text-3xl shadow-inner">
                                {statusInfo.icon}
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold text-white tracking-tight">{statusInfo.label}</h2>
                                <p className="text-white/80 font-medium">{statusInfo.description}</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Progress Timeline */}
                <div className="bg-gray-800/50 rounded-2xl border border-gray-700 p-8 shadow-xl">
                    <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-500 mb-8">Delivery Progress</h3>
                    <div className="flex justify-between items-start relative px-4">
                        {/* Connecting Line */}
                        <div className="absolute top-6 left-12 right-12 h-0.5 bg-gray-700 -z-0" />
                        <div
                            className="absolute top-6 left-12 h-0.5 bg-cyan-500 transition-all duration-1000 -z-0"
                            style={{ width: `${(progressSteps.filter(s => s.completed).length - 1) / (progressSteps.length - 1) * 100}%` }}
                        />

                        {progressSteps.map((step) => (
                            <div key={step.status} className="flex flex-col items-center flex-1 relative z-10 px-2">
                                <div className={`w-12 h-12 rounded-full flex items-center justify-center text-xl transition-all duration-500 ${step.completed ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/30' : 'bg-gray-700 text-gray-500'
                                    } ${step.current ? 'ring-4 ring-cyan-500/20 scale-110' : ''}`}>
                                    {step.completed ? (
                                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                        </svg>
                                    ) : (
                                        <span className="opacity-50">{step.icon}</span>
                                    )}
                                </div>
                                <div className={`mt-4 text-xs font-bold text-center uppercase tracking-tight ${step.completed ? 'text-white' : 'text-gray-600'}`}>
                                    {step.label}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="grid lg:grid-cols-2 gap-6">
                    {/* Delivery Info */}
                    <div className="bg-gray-800/50 rounded-2xl border border-gray-700 p-8 shadow-xl space-y-8">
                        <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-500">Delivery Information</h3>

                        <div className="space-y-6">
                            <div className="relative pl-6 border-l-2 border-gray-700">
                                <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-cyan-500 border-4 border-gray-900 shadow-sm shadow-cyan-500/50" />
                                <p className="text-[10px] uppercase font-bold text-gray-500 tracking-widest mb-1">Pickup Location</p>
                                <p className="text-white font-semibold leading-snug">{delivery.pickup_address || '---'}</p>
                            </div>

                            <div className="relative pl-6 border-l-2 border-dashed border-gray-700 py-2" />

                            <div className="relative pl-6 border-l-2 border-gray-700">
                                <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-red-500 border-4 border-gray-900 shadow-sm shadow-red-500/50" />
                                <p className="text-[10px] uppercase font-bold text-gray-500 tracking-widest mb-1">Dropoff Location</p>
                                <p className="text-white font-semibold leading-snug">{delivery.dropoff_address || '---'}</p>
                            </div>

                            <div className="pt-4 grid grid-cols-2 gap-6">
                                <div>
                                    <p className="text-[10px] uppercase font-bold text-gray-500 tracking-widest mb-1">Package</p>
                                    <p className="text-white font-mono bg-gray-900/50 px-2 py-1 rounded inline-block">[{delivery.package_description || 'STANDARD'}]</p>
                                </div>
                                <div>
                                    <p className="text-[10px] uppercase font-bold text-gray-500 tracking-widest mb-1">Unlock PIN</p>
                                    <p className="text-xl font-mono font-black text-cyan-400 tracking-tighter">{delivery.pin}</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-6 pt-2">
                                <div>
                                    <p className="text-xs text-gray-500 mb-1">Sender</p>
                                    <p className="text-sm font-bold text-white">{delivery.sender_name || 'Anonymous'}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500 mb-1">Receiver</p>
                                    <p className="text-sm font-bold text-white">{delivery.receiver_name || 'Anonymous'}</p>
                                </div>
                            </div>
                        </div>

                        {delivery.status === 'assigned' && (
                            <button
                                onClick={() => updateDeliveryStatus('in_transit')}
                                className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold transition-all shadow-lg shadow-blue-600/20 active:scale-[0.98] flex items-center justify-center gap-2"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                </svg>
                                Start Transit
                            </button>
                        )}
                        {delivery.status === 'in_transit' && (
                            <button
                                onClick={() => updateDeliveryStatus('delivered')}
                                className="w-full py-4 bg-green-600 hover:bg-green-500 text-white rounded-xl font-bold transition-all shadow-lg shadow-green-600/20 active:scale-[0.98] flex items-center justify-center gap-2"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                                Mark Delivered
                            </button>
                        )}
                    </div>

                    {/* Drone Info */}
                    <div className="bg-gray-800/50 rounded-2xl border border-gray-700 p-8 shadow-xl flex flex-col">
                        <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-500 mb-6">Assigned Drone</h3>

                        {delivery.drone ? (
                            <div className="space-y-8 flex-1 flex flex-col">
                                <div className="flex items-center gap-5 p-4 bg-gray-900/30 rounded-2xl border border-white/5">
                                    <div className={`w-16 h-16 rounded-xl flex items-center justify-center shadow-lg transform rotate-45 ${delivery.drone.status === 'flying' ? 'bg-cyan-500 shadow-cyan-500/20' : 'bg-green-500 shadow-green-500/20'
                                        }`}>
                                        <svg className="w-8 h-8 text-white -rotate-45" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                                        </svg>
                                    </div>
                                    <div>
                                        <p className="text-xl font-black text-white">{delivery.drone.name}</p>
                                        <div className="flex items-center gap-2">
                                            <span className={`w-2 h-2 rounded-full animate-pulse ${delivery.drone.status === 'flying' ? 'bg-cyan-400' : 'bg-green-400'
                                                }`} />
                                            <p className={`text-xs font-bold uppercase tracking-widest ${delivery.drone.status === 'flying' ? 'text-cyan-400' : 'text-green-400'
                                                }`}>
                                                {delivery.drone.status}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-6">
                                    <div>
                                        <div className="flex justify-between items-center mb-2">
                                            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Battery</p>
                                            <span className={`text-xs font-bold ${delivery.drone.battery_level > 20 ? 'text-white' : 'text-red-500 animate-bounce'
                                                }`}>{delivery.drone.battery_level}%</span>
                                        </div>
                                        <div className="h-2 bg-gray-900 rounded-full overflow-hidden border border-white/5 shadow-inner">
                                            <div
                                                className={`h-full transition-all duration-1000 ${delivery.drone.battery_level > 50 ? 'bg-green-500' :
                                                    delivery.drone.battery_level > 20 ? 'bg-yellow-500' : 'bg-red-500'
                                                    }`}
                                                style={{ width: `${delivery.drone.battery_level}%` }}
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Current Location</p>
                                        <div className="p-3 bg-gray-900/50 rounded-xl font-mono text-sm border border-white/5 flex items-center gap-3">
                                            <div className="w-2 h-2 rounded-full bg-cyan-500 shadow-sm shadow-cyan-500/50" />
                                            {delivery.drone.current_lat?.toFixed(5)}, {delivery.drone.current_lng?.toFixed(5)}
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-auto pt-6 space-y-3">
                                    <button
                                        onClick={() => updateDeliveryStatus('in_transit')}
                                        className="w-full py-4 bg-gray-800 hover:bg-gray-700 text-white rounded-xl font-bold transition-all border border-gray-700 active:scale-[0.98] flex items-center justify-center gap-2"
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                                        </svg>
                                        Fly to Destination
                                    </button>
                                    <Link
                                        href={`/control/${delivery.drone.id}`}
                                        className="block w-full py-4 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl font-bold transition-all shadow-lg shadow-cyan-600/20 text-center active:scale-[0.98]"
                                    >
                                        Open Drone Control
                                    </Link>
                                </div>
                            </div>
                        ) : (
                            <div className="text-center py-12 text-gray-600 flex-1 flex flex-col justify-center">
                                <div className="w-20 h-20 mx-auto mb-6 bg-gray-800 p-4 rounded-3xl border border-gray-700 opacity-50">
                                    <svg className="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                                    </svg>
                                </div>
                                <p className="font-bold uppercase tracking-widest text-xs">No drone assigned yet</p>
                                <p className="text-sm mt-2">Waiting for operator to initialize mission...</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Timestamps */}
                <div className="bg-gray-800/50 rounded-2xl border border-gray-700 p-8 shadow-xl">
                    <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-500 mb-6">Execution Timeline</h3>
                    <div className="grid md:grid-cols-2 gap-8">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-gray-900 flex items-center justify-center text-gray-500">📅</div>
                            <div>
                                <p className="text-[10px] uppercase font-bold text-gray-500 tracking-widest mb-0.5">Order Created</p>
                                <p className="text-sm font-bold text-white">{new Date(delivery.created_at).toLocaleString()}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-gray-900 flex items-center justify-center text-gray-500">🔄</div>
                            <div>
                                <p className="text-[10px] uppercase font-bold text-gray-500 tracking-widest mb-0.5">Last System Update</p>
                                <p className="text-sm font-bold text-white">{new Date(delivery.updated_at).toLocaleString()}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
