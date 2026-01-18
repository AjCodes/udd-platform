'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@udd/shared';
import type { Drone, Telemetry, Delivery } from '@udd/shared';
import DroneControl from '@/components/DroneControl';
import DroneTelemetry from '@/components/DroneTelemetry';

export default function MissionControl({ params }: { params: { id: string } }) {
    const router = useRouter();
    const [drone, setDrone] = useState<Drone | null>(null);
    const [telemetry, setTelemetry] = useState<Telemetry | null>(null);
    const [delivery, setDelivery] = useState<Delivery | null>(null);
    const [loading, setLoading] = useState(true);

    const supabase = createBrowserClient();

    useEffect(() => {
        const loadInitialData = async () => {
            // Get drone details
            const { data: droneData } = await supabase
                .from('drones')
                .select('*')
                .eq('id', params.id)
                .single();

            if (!droneData) {
                router.push('/');
                return;
            }

            setDrone(droneData);

            // Get active delivery for this drone
            const { data: deliveryData } = await supabase
                .from('deliveries')
                .select('*')
                .eq('drone_id', params.id)
                .in('status', ['assigned', 'in_transit'])
                .single();

            setDelivery(deliveryData);
            setLoading(false);
        };

        loadInitialData();

        // Subscribe to drone status updates
        const droneSub = supabase
            .channel(`drone-${params.id}`)
            // @ts-ignore
            .on('postgres_changes', {
                event: 'UPDATE',
                schema: 'public',
                table: 'drones',
                filter: `id=eq.${params.id}`
            }, (payload: any) => {
                setDrone(payload.new as Drone);
            })
            .subscribe();

        // SSE for telemetry
        const eventSource = new EventSource(`/api/drones/${params.id}/telemetry`);
        eventSource.onmessage = (event) => {
            const data = JSON.parse(event.data);
            setTelemetry(data);
        };

        return () => {
            droneSub.unsubscribe();
            eventSource.close();
        };
    }, [params.id, router]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-zinc-50">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-600"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-zinc-50">
            {/* Mission Header */}
            <header className="bg-zinc-900 text-white px-8 py-4 flex items-center justify-between sticky top-0 z-20">
                <div className="flex items-center gap-6">
                    <button onClick={() => router.back()} className="p-2 hover:bg-zinc-800 rounded-lg transition-colors">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                    </button>
                    <div>
                        <h1 className="text-xl font-bold">{drone?.name}</h1>
                        <p className="text-zinc-400 text-sm">Mission ID: {delivery?.id.slice(0, 8) || 'N/A'}</p>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <span className={`px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest ${drone?.status === 'flying' ? 'bg-sky-500' : 'bg-emerald-500'
                        }`}>
                        {drone?.status}
                    </span>
                    <div className="h-8 w-px bg-zinc-700"></div>
                    <div className="flex items-center gap-2">
                        <div className="text-right">
                            <div className="text-xs text-zinc-500 font-bold uppercase">Signal</div>
                            <div className="text-sm font-mono text-green-400">-45 dBm</div>
                        </div>
                    </div>
                </div>
            </header>

            <main className="p-8 grid grid-cols-1 lg:grid-cols-4 gap-8">
                {/* Left Column: Visuals */}
                <div className="lg:col-span-3 space-y-8">
                    {/* Video Feed Placeholder */}
                    <div className="aspect-video bg-zinc-900 rounded-2xl overflow-hidden relative shadow-2xl">
                        <div className="absolute inset-0 flex items-center justify-center text-zinc-700">
                            <div className="text-center">
                                <svg className="w-20 h-20 mx-auto mb-4 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                </svg>
                                <p className="font-mono text-xs uppercase tracking-widest">Awaiting Video Link...</p>
                            </div>
                        </div>
                        {/* HUD Overlay */}
                        <div className="absolute top-6 left-6 flex flex-col gap-2">
                            <div className="bg-black/40 backdrop-blur-sm px-3 py-1 rounded text-[10px] font-mono text-green-400 border border-green-500/20">
                                COMPASS: 184° S
                            </div>
                            <div className="bg-black/40 backdrop-blur-sm px-3 py-1 rounded text-[10px] font-mono text-green-400 border border-green-500/20">
                                GPS: {telemetry?.latitude.toFixed(6)}, {telemetry?.longitude.toFixed(6)}
                            </div>
                        </div>
                    </div>

                    {/* Telemetry Bar */}
                    <DroneTelemetry status={drone?.status || 'idle'} telemetry={telemetry} />

                    {/* Map & Flight Info */}
                    <div className="grid grid-cols-2 gap-8">
                        <div className="bg-white rounded-xl border border-zinc-200 p-6 h-[400px] shadow-sm relative overflow-hidden">
                            <div className="absolute inset-0 bg-zinc-100 flex items-center justify-center text-zinc-400">
                                <p className="text-xs font-bold uppercase tracking-widest">Map View (Leaflet Implementation Pending)</p>
                            </div>
                        </div>
                        <div className="bg-white rounded-xl border border-zinc-200 p-6 shadow-sm">
                            <h3 className="font-bold text-zinc-900 mb-6 uppercase text-sm tracking-wider">Mission Logistics</h3>
                            <div className="space-y-6">
                                <div>
                                    <p className="text-[10px] font-black text-zinc-400 uppercase mb-1">Pickup From</p>
                                    <p className="text-sm font-medium text-zinc-900">{delivery?.pickup_address || '---'}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-zinc-400 uppercase mb-1">Deliver To</p>
                                    <p className="text-sm font-medium text-zinc-900">{delivery?.dropoff_address || '---'}</p>
                                </div>
                                <div className="pt-4 border-t border-zinc-100">
                                    <p className="text-[10px] font-black text-zinc-400 uppercase mb-1">Package Info</p>
                                    <p className="text-sm text-zinc-600">{delivery?.package_description || 'Standard Payload'}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Column: Controls */}
                <div className="lg:col-span-1">
                    <div className="sticky top-28">
                        <DroneControl droneId={params.id} droneName={drone?.name || ''} telemetry={telemetry} />
                    </div>
                </div>
            </main>
        </div>
    );
}
