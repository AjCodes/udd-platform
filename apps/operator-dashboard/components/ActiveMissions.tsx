'use client';

import { useEffect, useState } from 'react';
import { createBrowserClient } from '@shared/supabase';
import type { Delivery, Drone } from '@shared/types';
import Link from 'next/link';

interface MissionWithDrone extends Delivery {
    drone: Drone;
}

export default function ActiveMissions() {
    const [missions, setMissions] = useState<MissionWithDrone[]>([]);
    const [loading, setLoading] = useState(true);

    const supabase = createBrowserClient();

    useEffect(() => {
        const fetchMissions = async () => {
            const { data, error } = await supabase
                .from('deliveries')
                .select('*, drone:drones(*)')
                .in('status', ['assigned', 'in_transit'])
                .order('updated_at', { ascending: false });

            if (error) {
                console.error('Error fetching missions:', error);
                return;
            }

            setMissions(data as MissionWithDrone[] || []);
            setLoading(false);
        };

        fetchMissions();

        const subscription = supabase
            .channel('mission-updates')
            .on('postgres_changes', { event: '*', table: 'deliveries' }, fetchMissions)
            .on('postgres_changes', { event: '*', table: 'drones' }, fetchMissions)
            .subscribe();

        return () => {
            subscription.unsubscribe();
        };
    }, []);

    if (loading) return <div>Loading missions...</div>;

    return (
        <div className="bg-white rounded-xl shadow-sm border border-zinc-200 overflow-hidden">
            <div className="p-4 border-b border-zinc-100 bg-zinc-50/50 flex justify-between items-center">
                <h2 className="font-semibold text-zinc-900 text-lg">Active Missions</h2>
                <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-bold rounded-full">
                    {missions.length} LIVE
                </span>
            </div>

            <div className="divide-y divide-zinc-100">
                {missions.length === 0 ? (
                    <div className="p-8 text-center text-zinc-500 italic">
                        No active missions.
                    </div>
                ) : (
                    missions.map((mission) => (
                        <Link
                            key={mission.id}
                            href={`/drones/${mission.drone_id}`}
                            className="p-4 hover:bg-zinc-50 transition-colors block"
                        >
                            <div className="flex justify-between items-start mb-2">
                                <div>
                                    <div className="text-sm font-bold text-zinc-900">
                                        {mission.drone.name}
                                    </div>
                                    <div className="text-xs text-zinc-500">
                                        Delivery #{mission.id.slice(0, 8)}
                                    </div>
                                </div>
                                <div className="flex flex-col items-end gap-1">
                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${mission.status === 'in_transit' ? 'bg-sky-100 text-sky-700' : 'bg-blue-100 text-blue-700'
                                        }`}>
                                        {mission.status.replace('_', ' ')}
                                    </span>
                                    <div className="flex items-center gap-1 text-xs text-zinc-500">
                                        <svg className="w-3 h-3 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                                            <path d="M3 5a2 2 0 012-2h10a2 2 0 012 2v8a2 2 0 01-2 2h-2.22l.123.489.804.804A1 1 0 0113 18H7a1 1 0 01-.707-1.707l.804-.804L7.22 15H5a2 2 0 01-2-2V5z" />
                                        </svg>
                                        {mission.drone.battery_level}%
                                    </div>
                                </div>
                            </div>

                            <div className="mt-2 text-sm text-zinc-600 truncate">
                                Destination: {mission.dropoff_address}
                            </div>
                        </Link>
                    ))
                )}
            </div>
        </div>
    );
}
