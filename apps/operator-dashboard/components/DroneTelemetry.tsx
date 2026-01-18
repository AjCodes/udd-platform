'use client';

import type { Telemetry, DroneStatus } from '@udd/shared';

interface DroneTelemetryProps {
    status: DroneStatus;
    telemetry: Telemetry | null;
}

export default function DroneTelemetry({ status, telemetry }: DroneTelemetryProps) {
    const stats = [
        {
            label: 'Battery',
            value: telemetry ? `${telemetry.battery_level}%` : '--',
            icon: 'M13 10V3L4 14h7v7l9-11h-7z',
            color: telemetry?.battery_level && telemetry.battery_level < 20 ? 'text-red-500' : 'text-green-500'
        },
        {
            label: 'Altitude',
            value: telemetry ? `${telemetry.altitude.toFixed(1)}m` : '0.0m',
            icon: 'M13 7h8m0 0v8m0-8l-8 8-4-4-6 6',
            color: 'text-sky-500'
        },
        {
            label: 'Speed',
            value: telemetry ? `${telemetry.speed.toFixed(1)}m/s` : '0.0m/s',
            icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z',
            color: 'text-amber-500'
        },
    ];

    return (
        <div className="grid grid-cols-3 gap-6">
            {stats.map((stat) => (
                <div key={stat.label} className="bg-white p-6 rounded-xl border border-zinc-200 shadow-sm">
                    <div className="flex items-center gap-3 mb-4">
                        <div className={`p-2 rounded-lg bg-zinc-50 ${stat.color}`}>
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={stat.icon} />
                            </svg>
                        </div>
                        <span className="text-sm font-bold text-zinc-500 uppercase tracking-wider">{stat.label}</span>
                    </div>
                    <div className="text-3xl font-black text-zinc-900">
                        {stat.value}
                    </div>
                </div>
            ))}
        </div>
    );
}
