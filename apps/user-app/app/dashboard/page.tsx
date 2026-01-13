'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { createBrowserClient } from '@shared/supabase';
import type { Delivery } from '@shared/types';
import BottomNav from '@/components/BottomNav';
import DeliveryCard from '@/components/DeliveryCard';

export default function DashboardPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [user, setUser] = useState<{ email: string; full_name?: string } | null>(null);
    const [deliveries, setDeliveries] = useState<Delivery[]>([]);
    const [loading, setLoading] = useState(true);
    const [showToast, setShowToast] = useState(false);
    const [toastMessage, setToastMessage] = useState('');

    useEffect(() => {
        const loadData = async () => {
            const supabase = createBrowserClient();

            // Check auth
            const { data: { user: authUser } } = await supabase.auth.getUser();
            if (!authUser) {
                router.push('/login');
                return;
            }

            // Check for login success message
            const loginSuccess = searchParams.get('login');
            if (loginSuccess === 'success') {
                setToastMessage('Successfully logged in!');
                setShowToast(true);
                setTimeout(() => setShowToast(false), 3000);
            }

            // Get user profile from db
            const { data: profile } = await supabase
                .from('users')
                .select('email, full_name')
                .eq('id', authUser.id)
                .single();

            // Fallback to name from auth metadata (Google/Signup)
            const authName = authUser.user_metadata?.full_name || authUser.user_metadata?.name;

            setUser({
                email: profile?.email || authUser.email || '',
                full_name: profile?.full_name || authName
            });

            // Get active deliveries
            const { data: deliveriesData } = await supabase
                .from('deliveries')
                .select('*')
                .eq('user_id', authUser.id)
                .in('status', ['pending', 'assigned', 'in_transit'])
                .order('created_at', { ascending: false });

            setDeliveries(deliveriesData || []);
            setLoading(false);
        };

        loadData();
    }, [router, searchParams]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-500"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen pb-20">
            {/* Toast notification */}
            {showToast && (
                <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    {toastMessage}
                </div>
            )}

            {/* Header */}
            <div className="bg-gradient-to-br from-sky-500 to-sky-600 text-white px-4 pt-12 pb-8 rounded-b-3xl">
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center overflow-hidden backdrop-blur-sm">
                        <img src="/logo.png" alt="UDD" className="w-full h-full object-cover" />
                    </div>
                    <h1 className="text-xl font-bold">UDD</h1>
                </div>
                <h2 className="text-2xl font-bold">
                    Welcome, {user?.full_name?.split(' ')[0] || 'User'}!
                </h2>
                <p className="text-sky-100 mt-1">Request drone delivery anywhere</p>
            </div>

            {/* Main content */}
            <div className="px-4 -mt-4">
                {/* Request button */}
                <Link href="/new-delivery" className="btn-primary w-full flex items-center justify-center gap-2 shadow-lg">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Request Delivery
                </Link>

                {/* Active deliveries */}
                <div className="mt-8">
                    <h2 className="text-lg font-semibold mb-4">Active Deliveries</h2>
                    {deliveries.length === 0 ? (
                        <div className="card text-center py-8">
                            <div className="text-gray-400 mb-2">
                                <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                                </svg>
                            </div>
                            <p className="text-gray-500">No active deliveries</p>
                            <p className="text-gray-400 text-sm">Request a delivery to get started</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {deliveries.map((delivery) => (
                                <DeliveryCard key={delivery.id} delivery={delivery} />
                            ))}
                        </div>
                    )}
                </div>
            </div>

            <BottomNav />
        </div>
    );
}
