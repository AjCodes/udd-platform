import type { Delivery } from '@udd/shared';
import Link from 'next/link';

interface DeliveryCardProps {
    delivery: Delivery;
}

export default function DeliveryCard({ delivery }: DeliveryCardProps) {
    const statusColors: Record<string, string> = {
        pending: 'bg-yellow-100 text-yellow-700',
        assigned: 'bg-blue-100 text-blue-700',
        in_transit: 'bg-sky-100 text-sky-700',
        delivered: 'bg-green-100 text-green-700',
        cancelled: 'bg-gray-100 text-gray-500',
    };

    const statusLabels: Record<string, string> = {
        pending: 'Pending',
        assigned: 'Assigned',
        in_transit: 'In Transit',
        delivered: 'Delivered',
        cancelled: 'Cancelled',
    };

    return (
        <Link href={`/delivery/${delivery.id}`} className="card block hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-3">
                <div>
                    <p className="text-sm text-gray-500">Order #{delivery.id.slice(0, 8)}</p>
                    <p className="font-medium">{delivery.pickup_address || 'Pickup location'}</p>
                    <p className="text-gray-500 text-sm">→ {delivery.dropoff_address || 'Dropoff location'}</p>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[delivery.status]}`}>
                    {statusLabels[delivery.status]}
                </span>
            </div>
            {delivery.package_description && (
                <p className="text-sm text-gray-500 truncate">{delivery.package_description}</p>
            )}
        </Link>
    );
}
