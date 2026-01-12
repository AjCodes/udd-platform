'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@shared/supabase';

export default function NewDeliveryPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const [formData, setFormData] = useState({
        pickupAddress: '',
        pickupLat: 51.4416,
        pickupLng: 5.4697,
        dropoffAddress: '',
        dropoffLat: 51.4500,
        dropoffLng: 5.4800,
        description: '',
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const supabase = createBrowserClient();

            // Check auth
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                router.push('/login');
                return;
            }

            // Generate PIN
            const pin = Math.floor(100000 + Math.random() * 900000).toString();

            // Create delivery
            const { data, error: insertError } = await supabase
                .from('deliveries')
                .insert({
                    user_id: user.id,
                    status: 'pending',
                    pin,
                    pickup_lat: formData.pickupLat,
                    pickup_lng: formData.pickupLng,
                    pickup_address: formData.pickupAddress,
                    dropoff_lat: formData.dropoffLat,
                    dropoff_lng: formData.dropoffLng,
                    dropoff_address: formData.dropoffAddress,
                    package_description: formData.description,
                })
                .select()
                .single();

            if (insertError) throw insertError;

            // Redirect to confirmation with PIN
            router.push(`/delivery/${data.id}/confirmed?pin=${data.pin}`);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to create delivery');
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <div className="bg-white border-b px-4 py-4 flex items-center">
                <button onClick={() => router.back()} className="mr-4">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                </button>
                <h1 className="text-xl font-semibold">New Delivery Request</h1>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-4 space-y-6">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        <span className="flex items-center gap-2">
                            <span className="w-6 h-6 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-xs">A</span>
                            Pickup Address
                        </span>
                    </label>
                    <input
                        type="text"
                        className="input"
                        placeholder="Enter pickup address"
                        value={formData.pickupAddress}
                        onChange={(e) => setFormData({ ...formData, pickupAddress: e.target.value })}
                        required
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        <span className="flex items-center gap-2">
                            <span className="w-6 h-6 bg-red-100 text-red-600 rounded-full flex items-center justify-center text-xs">B</span>
                            Dropoff Address
                        </span>
                    </label>
                    <input
                        type="text"
                        className="input"
                        placeholder="Enter dropoff address"
                        value={formData.dropoffAddress}
                        onChange={(e) => setFormData({ ...formData, dropoffAddress: e.target.value })}
                        required
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Package Description (optional)
                    </label>
                    <textarea
                        className="input min-h-[100px]"
                        placeholder="What are you sending?"
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    />
                </div>

                {error && (
                    <div className="text-red-500 text-sm bg-red-50 p-3 rounded-lg">
                        {error}
                    </div>
                )}

                <button
                    type="submit"
                    disabled={loading}
                    className="btn-primary w-full disabled:opacity-50"
                >
                    {loading ? 'Creating...' : 'Submit Request'}
                </button>
            </form>
        </div>
    );
}
