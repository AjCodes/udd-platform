'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Image from 'next/image';
import { createBrowserClient } from '@/lib/supabase';
import type { Delivery } from '@udd/shared';
import HoldToUnlock from '@/components/HoldToUnlock';
import TrackingMap from '@/components/TrackingMap';

export default function DeliveryTrackingPage() {
    const router = useRouter();
    const params = useParams();
    const [delivery, setDelivery] = useState<Delivery | null>(null);
    const [loading, setLoading] = useState(true);
    const [unlocking, setUnlocking] = useState(false);
    const [copied, setCopied] = useState(false);
    const [droneLocation, setDroneLocation] = useState<{ lat: number; lng: number } | null>(null);
    const [showMap, setShowMap] = useState(false);

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

                // Fetch live drone location if assigned
                if (data.drone_id) {
                    const { data: droneData } = await supabase
                        .from('drones')
                        .select('current_lat, current_lng')
                        .eq('id', data.drone_id)
                        .single();

                    if (droneData && droneData.current_lat && droneData.current_lng) {
                        setDroneLocation({ lat: droneData.current_lat, lng: droneData.current_lng });
                    }
                }

                // SIMULATION: If pending, trigger fake assignment after 3-5s
                if (data.status === 'pending') {
                    const randomDelay = Math.floor(Math.random() * 2000) + 3000;
                    setTimeout(() => {
                        fetch('/api/simulation/assign-drone', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ deliveryId: data.id })
                        }).catch(err => console.error('Sim error:', err));
                    }, randomDelay);
                }
            }
            setLoading(false);
        };

        loadDelivery();

        // Poll for updates every 2 seconds for faster feedback
        const interval = setInterval(loadDelivery, 2000);
        return () => clearInterval(interval);
    }, [params.id, router]);

    // Calculate distance for ETA
    const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
        const R = 6371;
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLng = (lng2 - lng1) * Math.PI / 180;
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLng / 2) * Math.sin(dLng / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    };

    const distance = delivery ? calculateDistance(
        delivery.pickup_lat, delivery.pickup_lng,
        delivery.dropoff_lat, delivery.dropoff_lng
    ) : 0;

    // ETA: Drone speed ~60 km/h, plus 2 min for takeoff/landing
    const etaMinutes = Math.ceil((distance / 60) * 60) + 2;

    const handleShare = async () => {
        if (!delivery) return;

        const shareText = `🚁 UDD Delivery\n\nPIN: ${delivery.pin}\n\nFrom: ${delivery.pickup_address}\nTo: ${delivery.dropoff_address}\n\nUse this PIN to unlock the drone storage compartment.`;

        if (navigator.share) {
            try {
                await navigator.share({
                    title: 'UDD Delivery PIN',
                    text: shareText,
                });
            } catch {
                // User cancelled
            }
        } else {
            await navigator.clipboard.writeText(shareText);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const handleUnlock = async () => {
        if (!delivery) return;
        setUnlocking(true);

        const supabase = createBrowserClient();
        await supabase
            .from('deliveries')
            .update({ status: 'delivered', updated_at: new Date().toISOString() })
            .eq('id', delivery.id);

        setTimeout(() => {
            router.push('/dashboard?delivered=true');
        }, 1500);
    };

    // Get status info
    const getStatusInfo = () => {
        if (!delivery) return { step: 0, title: 'Loading...', subtitle: '', animate: true };

        switch (delivery.status) {
            case 'pending':
                return { step: 0, title: 'Finding a drone...', subtitle: "We're assigning a drone to your delivery", animate: true };
            case 'assigned':
                return { step: 0, title: 'Drone Assigned!', subtitle: 'Flying to Pickup Point', animate: true };
            case 'in_transit':
                return { step: 1, title: 'Package Picked Up!', subtitle: `Flying to Dropoff Point (~${etaMinutes} min)`, animate: true };
            case 'delivered':
                return { step: 3, title: 'Delivered!', subtitle: 'Package delivered safely', animate: false };
            default:
                return { step: 0, title: 'Processing...', subtitle: '', animate: true };
        }
    };

    const status = getStatusInfo();

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--bg)' }}>
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto mb-4" style={{ borderColor: 'var(--primary)' }}></div>
                    <p className="text-gray-500">Loading delivery...</p>
                </div>
            </div>
        );
    }

    if (!delivery) {
        return (
            <div className="min-h-screen flex items-center justify-center p-5" style={{ backgroundColor: 'var(--bg)' }}>
                <div className="text-center">
                    <div className="text-6xl mb-4">🔍</div>
                    <p className="text-xl text-gray-500 mb-4">Delivery not found</p>
                    <button onClick={() => router.push('/dashboard')} className="btn-primary">
                        Go to Dashboard
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex flex-col" style={{ backgroundColor: 'var(--bg)' }}>
            {/* Header */}
            <div className="bg-white border-b px-5 py-5 flex items-center justify-between">
                <div className="flex items-center">
                    <button
                        onClick={() => router.push('/history')}
                        className="mr-4 p-2 -ml-2 rounded-xl hover:bg-gray-100 transition-colors"
                        style={{ minHeight: '48px', minWidth: '48px' }}
                    >
                        <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                    </button>
                    <h1 className="text-xl font-semibold">Track Delivery</h1>
                </div>
                <span className="text-sm px-3 py-1 rounded-full font-medium" style={{
                    backgroundColor: 'var(--primary-light)',
                    color: 'var(--primary-dark)'
                }}>
                    {delivery.status.replace('_', ' ').toUpperCase()}
                </span>
            </div>

            <div className="p-5 flex-1 space-y-5">
                {/* Status Card */}
                <div className="card text-center py-8">
                    <div className={`mb-2 flex justify-center ${status.animate ? 'animate-pulse-float' : ''}`}>
                        {delivery.status === 'delivered' ? (
                            <span className="text-6xl">✅</span>
                        ) : (
                            <Image
                                src="/drone_icon_high_res.png"
                                alt="UDD Drone"
                                width={192}
                                height={192}
                                className="w-48 h-48 object-contain mix-blend-multiply"
                                style={{
                                    filter: 'contrast(1.1)',
                                }}
                            />
                        )}
                    </div>
                    <h2 className="text-2xl font-bold mb-2">{status.title}</h2>
                    <p className="text-gray-500 text-lg">{status.subtitle}</p>

                    {/* ETA Badge */}
                    {(delivery.status === 'in_transit' || delivery.status === 'assigned') && (
                        <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-full" style={{ backgroundColor: 'var(--primary-light)' }}>
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: 'var(--primary)' }}>
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span className="font-semibold" style={{ color: 'var(--primary-dark)' }}>
                                ETA: {etaMinutes} min
                            </span>
                        </div>
                    )}

                    {/* Track Drone Button */}
                    {delivery.status === 'in_transit' && (
                        <button
                            onClick={() => setShowMap(true)}
                            className="mt-6 w-full py-3 bg-teal-600 text-white rounded-xl font-bold shadow-lg shadow-teal-200 active:scale-95 transition-all flex items-center justify-center gap-2"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 7m0 13V7" />
                            </svg>
                            Track Live Map
                        </button>
                    )}
                </div>

                {/* Progress Steps */}
                <div className="card">
                    <div className="flex items-center justify-between">
                        {['Pickup', 'Flying', 'Arrived'].map((label, i) => (
                            <div key={label} className="flex flex-col items-center flex-1">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm transition-all ${status.step >= i ? 'scale-110' : ''
                                    }`} style={{
                                        backgroundColor: status.step >= i ? 'var(--primary)' : '#d1d5db'
                                    }}>
                                    {status.step > i ? '✓' : i + 1}
                                </div>
                                <span className={`text-xs mt-2 font-medium ${status.step >= i ? 'text-gray-900' : 'text-gray-400'}`}>
                                    {label}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Delivery Details */}
                <div className="card">
                    <h3 className="font-semibold mb-4 text-gray-900">Delivery Details</h3>

                    <div className="space-y-6">
                        {/* Section A: Sender & Pickup */}
                        <div className="flex items-start gap-4">
                            <div className="flex flex-col items-center gap-2">
                                <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white shadow-sm" style={{ backgroundColor: 'var(--success)' }}>
                                    A
                                </div>
                                <div className="w-0.5 grow bg-gray-100 rounded-full min-h-[40px]"></div>
                            </div>
                            <div className="flex-1 space-y-3">
                                <div>
                                    <p className="text-[10px] font-bold text-teal-600 uppercase tracking-wider mb-1">Sender</p>
                                    <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                                        <p className="font-semibold text-gray-900">{delivery.sender_name}</p>
                                        <p className="text-sm text-gray-600 mb-2">{delivery.sender_phone}</p>
                                        <div className="pt-2 border-t border-gray-200">
                                            <p className="text-xs text-gray-400 mb-0.5">Pickup from:</p>
                                            <p className="text-sm font-medium text-gray-800">{delivery.pickup_address}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Section B: Receiver & Dropoff */}
                        <div className="flex items-start gap-4">
                            <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white shadow-sm shrink-0" style={{ backgroundColor: 'var(--warning)' }}>
                                B
                            </div>
                            <div className="flex-1 space-y-3">
                                <div>
                                    <p className="text-[10px] font-bold text-orange-600 uppercase tracking-wider mb-1">Receiver</p>
                                    <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                                        <p className="font-semibold text-gray-900">{delivery.receiver_name}</p>
                                        <p className="text-sm text-gray-600 mb-2">{delivery.receiver_phone}</p>
                                        <div className="pt-2 border-t border-gray-200">
                                            <p className="text-xs text-gray-400 mb-0.5">Deliver to:</p>
                                            <p className="text-sm font-medium text-gray-800">{delivery.dropoff_address}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Distance & Package */}
                    <div className="mt-4 pt-4 border-t flex justify-between text-sm">
                        <div>
                            <span className="text-gray-500">Distance: </span>
                            <span className="font-medium">{distance.toFixed(1)} km</span>
                        </div>
                        <div>
                            <span className="text-gray-500">Package: </span>
                            <span className="font-medium">{delivery.package_description || 'Standard'}</span>
                        </div>
                    </div>
                </div>

                {/* PIN Card */}
                <div className="card" style={{ backgroundColor: 'var(--primary-light)', border: '2px solid var(--primary)' }}>
                    <div className="text-center mb-4">
                        <p className="text-sm font-medium mb-1" style={{ color: 'var(--primary)' }}>YOUR UNLOCK PIN</p>
                        <p className="text-4xl font-bold font-mono tracking-[0.3em]" style={{ color: 'var(--primary-dark)' }}>
                            {delivery.pin}
                        </p>
                    </div>
                    <button
                        onClick={handleShare}
                        className="w-full py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all"
                        style={{
                            backgroundColor: copied ? 'var(--success)' : 'var(--primary)',
                            color: 'white'
                        }}
                    >
                        {copied ? (
                            <>
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                                Copied!
                            </>
                        ) : (
                            <>
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                                </svg>
                                Share PIN with Receiver
                            </>
                        )}
                    </button>
                </div>

                {/* Unlock section - only show if in_transit */}
                {delivery.status === 'in_transit' && (
                    <div className="mt-4">
                        {unlocking ? (
                            <div className="card text-center py-8" style={{ backgroundColor: 'var(--success)', border: 'none' }}>
                                <div className="text-5xl mb-3">🔓</div>
                                <p className="text-xl font-semibold text-white">
                                    Unlocked Successfully!
                                </p>
                            </div>
                        ) : (
                            <HoldToUnlock onUnlock={handleUnlock} />
                        )}
                    </div>
                )}
            </div>

            {/* Track Drone Map Modal */}
            {showMap && delivery && (
                <div className="fixed inset-0 z-50 bg-white flex flex-col">
                    <div className="bg-white border-b px-5 py-4 flex items-center justify-between shadow-sm z-10">
                        <h2 className="text-lg font-bold">Live Tracking</h2>
                        <button
                            onClick={() => setShowMap(false)}
                            className="bg-gray-100 p-2 rounded-full hover:bg-gray-200"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                    <div className="flex-1 relative">
                        <TrackingMap
                            droneLocation={droneLocation}
                            pickupLocation={{ lat: delivery.pickup_lat, lng: delivery.pickup_lng }}
                            dropoffLocation={{ lat: delivery.dropoff_lat, lng: delivery.dropoff_lng }}
                        />

                        {/* Floating Status Overlay */}
                        <div className="absolute bottom-8 left-5 right-5 bg-white p-4 rounded-2xl shadow-xl border border-gray-100">
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-sm text-gray-500">Estimated Arrival</span>
                                <span className="font-bold text-teal-600">{Math.ceil(distance / 40 * 60)} min</span>
                            </div>
                            <div className="w-full bg-gray-100 rounded-full h-2">
                                <div className="bg-teal-500 h-2 rounded-full animate-pulse" style={{ width: '60%' }}></div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
