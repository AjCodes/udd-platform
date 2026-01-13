'use client';

import { useEffect, useState } from 'react';
import { createBrowserClient } from '@shared/supabase';
import type { Drone } from '@shared/types';

export default function DroneStatusGrid() {
    const [drones, setDrones] = useState<Drone[]>([]);
    const [loading, setLoading] = useState(true);

    const supabase = createBrowserClient();

    useEffect(() => {
        const fetchDrones = async () => {
            const { data } = await supabase
                .from('drones')
                .select('*')
                .order('name', { ascending: true });

            setDrones(data || []);
            setLoading(false);
        };

        fetchDrones();

        const subscription = supabase
            .channel('drone-grid-updates')
            .on('postgres_changes', { event: '*', table: 'drones' }, fetchDrones)
            .subscribe();

        return () => {
            subscription.unsubscribe();
        };
    }, []);

    if (loading) return <div>Loading drone status...</div>;

    const statusColors: Record<string, string> = {
        idle: 'bg-emerald-500',
        flying: 'bg-sky-500',
        returning: 'bg-amber-500',
        charging: 'bg-purple-500',
        offline: 'bg-zinc-400',
    };

    return (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {drones.map((drone) => (
                <div key={drone.id} className="bg-white p-3 rounded-lg border border-zinc-200 shadow-sm flex flex-col gap-2">
                    <div className="flex justify-between items-center">
                        <span className="text-sm font-bold text-zinc-900 truncate">{drone.name}</span>
                        <div className={`w-2 h-2 rounded-full ${statusColors[drone.status] || 'bg-zinc-400'}`} />
                    </div>

                    <div className="flex justify-between items-end">
                        <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">{drone.status}</span>
                        <div className="flex items-center gap-1">
                            <div className="w-8 h-3 bg-zinc-100 rounded-sm overflow-hidden relative border border-zinc-200">
                                <div
                                    className={`h-full ${drone.battery_level > 20 ? 'bg-green-500' : 'bg-red-500'}`}
                                    style={{ width: `${drone.battery_level}%` }}
                                />
                            </div>
                            <span className="text-[10px] text-zinc-600 font-medium">{drone.battery_level}%</span>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}
