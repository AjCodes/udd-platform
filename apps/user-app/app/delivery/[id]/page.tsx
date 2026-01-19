'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Image from 'next/image';
import { createBrowserClient } from '@/lib/supabase';
import type { Delivery } from '@udd/shared';
import TrackingMap from '@/components/TrackingMap';

export default function DeliveryTrackingPage() {
    const router = useRouter();
    const params = useParams();
    const [delivery, setDelivery] = useState<Delivery | null>(null);
    const [loading, setLoading] = useState(true);
    const [copied, setCopied] = useState(false);
    const [droneLocation, setDroneLocation] = useState<{ lat: number; lng: number } | null>(null);
    const [showMap, setShowMap] = useState(false);
    const [userPhone, setUserPhone] = useState<string | null>(null);
    const [receiverPin, setReceiverPin] = useState('');
    const [pinLocked, setPinLocked] = useState(false);
    const [unlocking, setUnlocking] = useState(false);

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

                // Fetch current user phone to check if receiver
                const { data: profile } = await supabase
                    .from('users')
                    .select('phone')
                    .eq('id', user.id)
                    .single();

                if (profile?.phone) {
                    setUserPhone(profile.phone);
                }

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

        const trackingUrl = `${window.location.origin}/delivery/${delivery.id}`;
        const shareText = `🚁 UDD Delivery\n\nTrack & Accept here: ${trackingUrl}\n\nPIN: ${delivery.pin}\n\nFrom: ${delivery.pickup_address}\nTo: ${delivery.dropoff_address}\n\nUse this PIN to unlock the drone storage compartment.`;

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

    const handlePinInput = (digit: string) => {
        if (receiverPin.length < 6) {
            setReceiverPin(prev => prev + digit);
        }
    };

    const handlePinDelete = () => {
        setReceiverPin(prev => prev.slice(0, -1));
    };

    const handleAccept = async () => {
        if (!delivery) return;
        const supabase = createBrowserClient();
        const { error } = await supabase
            .from('deliveries')
            .update({ receiver_accepted: true })
            .eq('id', delivery.id);

        if (!error) {
            setDelivery(prev => prev ? { ...prev, receiver_accepted: true } : null);
        }
    };

    const handleDecline = async () => {
        if (!delivery) return;
        const supabase = createBrowserClient();
        const { error } = await supabase
            .from('deliveries')
            .update({
                receiver_accepted: false,
                status: 'cancelled'
            })
            .eq('id', delivery.id);

        if (!error) {
            setDelivery(prev => prev ? { ...prev, receiver_accepted: false, status: 'cancelled' } : null);
        }
    };

    const verifyAndUnlock = async () => {
        if (!delivery || receiverPin !== delivery.pin) {
            setPinLocked(true);
            setTimeout(() => {
                setPinLocked(false);
                setReceiverPin('');
            }, 1000);
            return;
        }

        setUnlocking(true);
        const supabase = createBrowserClient();

        const { error } = await supabase
            .from('deliveries')
            .update({ status: 'delivered', updated_at: new Date().toISOString() })
            .eq('id', delivery.id);

        if (!error) {
            // Success! The update will trigger re-fetch and show Delivered state
        } else {
            alert('Unlock failed: ' + error.message);
            setUnlocking(false);
        }
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

    const isReceiver = delivery?.receiver_phone === userPhone;
    const showAcceptPrompt = isReceiver && delivery?.receiver_accepted === null && (delivery?.status === 'pending' || delivery?.status === 'assigned');

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
                    <button onClick={() => router.push('/home')} className="btn-primary">
                        Go to Home
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex flex-col" style={{ backgroundColor: 'var(--bg)' }}>
            {/* Acceptance Prompt Overlay */}
            {showAcceptPrompt && (
                <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
                    <div className="bg-white rounded-[2.5rem] w-full max-w-md p-8 shadow-2xl animate-in fade-in slide-in-from-bottom-10 duration-500">
                        <div className="w-20 h-20 bg-primary/10 rounded-3xl flex items-center justify-center mx-auto mb-6">
                            <svg className="w-10 h-10 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                            </svg>
                        </div>
                        <h2 className="text-3xl font-black text-center mb-2 tracking-tight">Receive Package?</h2>
                        <p className="text-gray-500 text-center mb-8 text-lg">
                            Do you want to receive this package from <span className="font-bold text-gray-900">{delivery.sender_phone || 'a sender'}</span>?
                        </p>
                        <div className="grid grid-cols-2 gap-4">
                            <button
                                onClick={handleDecline}
                                className="py-4 rounded-2xl font-bold text-gray-500 bg-gray-100 hover:bg-gray-200 transition-colors active:scale-[0.98]"
                            >
                                No, decline
                            </button>
                            <button
                                onClick={handleAccept}
                                className="py-4 rounded-2xl font-bold text-white bg-primary hover:opacity-90 transition-opacity shadow-lg shadow-primary/20 active:scale-[0.98]"
                            >
                                Yes, accept
                            </button>
                        </div>
                    </div>
                </div>
            )}
            <style jsx global>{`
                @keyframes checkmark-draw {
                    0% {
                        stroke-dasharray: 100;
                        stroke-dashoffset: 100;
                        opacity: 0;
                    }
                    10% {
                        opacity: 1;
                    }
                    100% {
                        stroke-dasharray: 100;
                        stroke-dashoffset: 0;
                        opacity: 1;
                    }
                }

                .animate-checkmark-draw {
                    animation: checkmark-draw 1.2s cubic-bezier(0.65, 0, 0.45, 1) forwards;
                }

                @keyframes pulse-float {
                    0%, 100% {
                        transform: translateY(0) scale(1.02);
                    }
                    50% {
                        transform: translateY(-8px) scale(1.05);
                    }
                }

                .animate-pulse-float {
                    animation: pulse-float 4s ease-in-out infinite;
                }

                @keyframes spin-slow {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }

                .animate-spin-slow {
                    animation: spin-slow 10s linear infinite;
                }

                .animate-reverse-spin-slow {
                    animation: reverse-spin-slow 7s linear infinite;
                }

                @keyframes ring-glow {
                    0%, 100% { opacity: 0.3; filter: blur(8px); transform: rotateX(65deg) scale(1); }
                    50% { opacity: 0.6; filter: blur(12px); transform: rotateX(65deg) scale(1.05); }
                }

                .animate-ring-glow {
                    animation: ring-glow 3s ease-in-out infinite;
                }

                @keyframes ring-flow {
                    from { transform: rotateX(65deg) rotate(0deg); }
                    to { transform: rotateX(65deg) rotate(360deg); }
                }

                .animate-ring-flow {
                    animation: ring-flow 4s linear infinite;
                }

                @keyframes pulsate-ring {
                    0%, 100% { opacity: 0.2; transform: rotateX(65deg) scale(1); }
                    50% { opacity: 0.4; transform: rotateX(65deg) scale(1.02); }
                }

                .pulsate-ring {
                    animation: pulsate-ring 4s ease-in-out infinite;
                }

                /* 3D Parcel Box */
                @keyframes float-parcel {
                    0%, 100% { transform: rotateX(65deg) rotate(45deg) translateZ(0px); }
                    50% { transform: rotateX(65deg) rotate(45deg) translateZ(10px); }
                }

                .animate-parcel {
                    animation: float-parcel 3s ease-in-out infinite;
                }
            `}</style>

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
                <div className="card text-center py-8 pb-4">
                    <div className={`mb-5 flex justify-center relative ${status.animate ? 'animate-pulse-float' : ''}`}>
                        {delivery.status === 'delivered' ? (
                            <div className="relative w-48 h-48 flex items-center justify-center">
                                {/* Animated Mesh Gradient Circle */}
                                <div className="absolute inset-0 bg-gradient-to-tr from-emerald-400 via-teal-500 to-cyan-400 rounded-full animate-[spin_10s_linear_infinite] opacity-20 blur-2xl"></div>
                                <div className="absolute inset-4 bg-gradient-to-bl from-emerald-500 via-teal-600 to-cyan-500 rounded-full animate-[spin_7s_linear_infinite_reverse] opacity-30 blur-xl"></div>

                                <div className="relative w-32 h-32 bg-white rounded-3xl shadow-2xl flex items-center justify-center overflow-hidden group">
                                    {/* Glassmorphism Inner Glow */}
                                    <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-transparent pointer-events-none"></div>

                                    {/* Animated SVG Checkmark */}
                                    <svg viewBox="0 0 100 100" className="w-20 h-20 text-emerald-500 relative z-10 drop-shadow-md">
                                        <path
                                            d="M25 50 L45 70 L75 30"
                                            fill="none"
                                            stroke="currentColor"
                                            strokeWidth="10"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            className="animate-checkmark-draw"
                                        />
                                    </svg>

                                    {/* Success Glow */}
                                    <div className="absolute inset-0 bg-emerald-500/10 animate-pulse"></div>
                                </div>
                            </div>
                        ) : (
                            <div className="relative flex items-center justify-center w-64 h-52" style={{ perspective: '1000px' }}>
                                {/* The Glowing Ring (Searching/Assigned Phase) */}
                                {delivery.status !== 'in_transit' && (
                                    <div className={`absolute w-[180px] h-[180px] rounded-full border-[2.5px] border-emerald-400/40 ${delivery.status === 'assigned' ? 'animate-ring-glow opacity-50' :
                                        'opacity-30 pulsate-ring'
                                        }`} style={{
                                            boxShadow: '0 0 15px rgba(52, 211, 153, 0.3), inset 0 0 15px rgba(52, 211, 153, 0.3)',
                                            transform: 'rotateX(65deg)',
                                            top: '32%'
                                        }}></div>
                                )}

                                {/* The 3D Parcel Box (Delivery Phase) */}
                                {delivery.status === 'in_transit' && (
                                    <div className="absolute w-24 h-24 animate-parcel" style={{ top: '35%', transformStyle: 'preserve-3d' }}>
                                        {/* Box Sides - 6 Sides for Full 3D */}
                                        <div className="absolute inset-0 bg-[#D2B48C] border-[1.5px] border-[#8B4513]/30" style={{ transform: 'translateZ(48px)' }}>
                                            {/* Tape vertical */}
                                            <div className="absolute top-0 bottom-0 left-1/2 w-4 bg-[#8B4513]/20 -translate-x-1/2"></div>
                                        </div>
                                        <div className="absolute inset-0 bg-[#C1A273] border-[1.5px] border-[#8B4513]/30" style={{ transform: 'translateZ(-48px) rotateY(180deg)' }}></div>
                                        <div className="absolute inset-0 bg-[#B08D57] border-[1.5px] border-[#8B4513]/30" style={{ transform: 'translateX(48px) rotateY(90deg)' }}></div>
                                        <div className="absolute inset-0 bg-[#B08D57] border-[1.5px] border-[#8B4513]/30" style={{ transform: 'translateX(-48px) rotateY(-90deg)' }}></div>
                                        <div className="absolute inset-0 bg-[#E3C598] border-[1.5px] border-[#8B4513]/30" style={{ transform: 'translateY(-48px) rotateX(90deg)' }}>
                                            {/* Tape cross */}
                                            <div className="absolute top-0 bottom-0 left-1/2 w-4 bg-[#8B4513]/20 -translate-x-1/2"></div>
                                            <div className="absolute left-0 right-0 top-1/2 h-4 bg-[#8B4513]/20 -translate-y-1/2"></div>
                                        </div>
                                        <div className="absolute inset-0 bg-[#A68045] border-[1.5px] border-[#8B4513]/30" style={{ transform: 'translateY(48px) rotateX(-90deg)' }}></div>

                                        {/* Drop Shadow */}
                                        <div className="absolute inset-0 bg-black/10 blur-2xl translate-y-16 rounded-full" style={{ transform: 'rotateX(90deg) translateZ(-80px) scale(2)' }}></div>
                                    </div>
                                )}

                                {/* Background Ambient Glow */}
                                <div className={`absolute w-[200px] h-[100px] bg-emerald-400/15 rounded-[100%] blur-[35px] ${delivery.status === 'in_transit' ? 'animate-pulse' : ''
                                    }`} style={{
                                        transform: 'rotateX(65deg)',
                                        top: '30%'
                                    }}></div>

                                <Image
                                    src="/drone-3d-transparent.png"
                                    alt="UDD Drone"
                                    width={220}
                                    height={220}
                                    className="relative z-10 drop-shadow-2xl transition-all duration-700"
                                    style={{
                                        filter: delivery.status === 'in_transit' ? 'brightness(1.1) contrast(1.1)' : 'none',
                                        transform: delivery.status === 'in_transit' ? 'translateY(-8px) rotate(1deg)' : 'none',
                                        marginTop: '-55px'
                                    }}
                                />
                            </div>
                        )}
                    </div>
                    <h2 className={`text-3xl font-black mb-2 tracking-tight ${delivery.status === 'delivered' ? 'text-emerald-600 animate-[fade-in_1s_ease-out]' : ''}`}>
                        {status.title}
                    </h2>
                    <p className={`text-lg transition-colors duration-1000 ${delivery.status === 'delivered' ? 'text-emerald-500 font-medium' : 'text-gray-500'}`}>
                        {status.subtitle}
                    </p>

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

                {/* Receiver PIN Entry or Sender PIN Info */}
                {['pending', 'assigned', 'in_transit'].includes(delivery.status) && (
                    <div className="card" style={{
                        backgroundColor: pinLocked ? '#fee2e2' : 'var(--primary-light)',
                        border: `2px solid ${pinLocked ? '#ef4444' : 'var(--primary)'}`
                    }}>
                        {delivery.receiver_phone === userPhone ? (
                            <div className="flex flex-col items-center">
                                <p className="text-sm font-bold text-gray-500 mb-4 uppercase tracking-widest">Enter Compartment PIN</p>

                                {/* PIN Dots */}
                                <div className="flex gap-3 mb-8">
                                    {[...Array(6)].map((_, i) => (
                                        <div
                                            key={i}
                                            className={`w-4 h-4 rounded-full border-2 transition-all ${i < receiverPin.length
                                                ? 'bg-teal-600 border-teal-600'
                                                : 'border-teal-200'
                                                }`}
                                        />
                                    ))}
                                </div>

                                {/* Pad */}
                                <div className="grid grid-cols-3 gap-4 mb-6">
                                    {['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'delete'].map((key, i) => {
                                        if (key === '') return <div key={i} />;
                                        if (key === 'delete') {
                                            return (
                                                <button
                                                    key={i}
                                                    onClick={handlePinDelete}
                                                    className="w-14 h-14 rounded-2xl bg-white/50 flex items-center justify-center text-gray-400 active:scale-90 transition-transform"
                                                >
                                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M3 12l6.414 6.414a2 2 0 002.828 0L21 12l-8.758-8.758a2 2 0 00-2.828 0L3 12z" />
                                                    </svg>
                                                </button>
                                            );
                                        }
                                        return (
                                            <button
                                                key={i}
                                                onClick={() => handlePinInput(key)}
                                                className="w-14 h-14 rounded-2xl bg-white flex items-center justify-center text-xl font-bold text-gray-900 shadow-sm active:scale-90 transition-transform"
                                            >
                                                {key}
                                            </button>
                                        );
                                    })}
                                </div>

                                <button
                                    onClick={verifyAndUnlock}
                                    disabled={receiverPin.length < 6 || unlocking}
                                    className="w-full py-4 bg-teal-600 text-white rounded-2xl font-bold shadow-lg shadow-teal-100 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                                >
                                    {unlocking ? (
                                        <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" />
                                    ) : (
                                        <>
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 00-2 2z" />
                                            </svg>
                                            Unlock Compartment
                                        </>
                                    )}
                                </button>
                            </div>
                        ) : (
                            <div className="text-center">
                                <div className="mb-4">
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
