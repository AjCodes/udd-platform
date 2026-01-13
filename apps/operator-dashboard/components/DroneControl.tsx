'use client';

import { useState } from 'react';
import type { Telemetry } from '@shared/types';

interface DroneControlProps {
    droneId: string;
    droneName: string;
    telemetry: Telemetry | null;
}

export default function DroneControl({ droneId, droneName, telemetry }: DroneControlProps) {
    const [loading, setLoading] = useState<string | null>(null);

    const sendCommand = async (command: string, payload?: any) => {
        setLoading(command);
        try {
            const response = await fetch(`/api/drones/${droneId}/command`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ command, payload }),
            });

            if (!response.ok) throw new Error('Failed to send command');

            console.log(`Command ${command} sent successfully`);
        } catch (err) {
            console.error(err);
            alert(`Failed to send ${command}`);
        } finally {
            setLoading(null);
        }
    };

    const controls = [
        { id: 'takeoff', label: 'Takeoff', color: 'bg-emerald-600 hover:bg-emerald-700', icon: 'M5 10l7-7m0 0l7 7m-7-7v18' },
        { id: 'land', label: 'Land', color: 'bg-rose-600 hover:bg-rose-700', icon: 'M19 14l-7 7m0 0l-7-7m7 7V3' },
        { id: 'return_home', label: 'RTL (Home)', color: 'bg-amber-600 hover:bg-amber-700', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
        { id: 'hover', label: 'Hover', color: 'bg-sky-600 hover:bg-sky-700', icon: 'M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
    ];

    return (
        <div className="bg-zinc-900 rounded-xl p-6 text-white shadow-xl border border-zinc-800">
            <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                <svg className="w-5 h-5 text-sky-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                </svg>
                Flight Controls
            </h3>

            <div className="grid grid-cols-2 gap-4">
                {controls.map((ctrl) => (
                    <button
                        key={ctrl.id}
                        onClick={() => sendCommand(ctrl.id)}
                        disabled={loading !== null}
                        className={`flex flex-col items-center justify-center gap-3 p-4 rounded-xl transition-all active:scale-95 disabled:opacity-50 ${ctrl.color}`}
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={ctrl.icon} />
                        </svg>
                        <span className="text-xs font-bold uppercase tracking-wider">
                            {loading === ctrl.id ? 'Sending...' : ctrl.label}
                        </span>
                    </button>
                ))}
            </div>

            <div className="mt-8 pt-6 border-t border-zinc-800">
                <button
                    onClick={() => sendCommand('unlock')}
                    disabled={loading !== null}
                    className="w-full py-4 bg-zinc-100 hover:bg-white text-zinc-900 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
                    </svg>
                    Remote Unlock Cargo
                </button>
            </div>
        </div>
    );
}
