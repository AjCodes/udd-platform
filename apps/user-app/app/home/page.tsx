'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { createBrowserClient } from '@/lib/supabase';
import type { Delivery } from '@udd/shared';
import BottomNav from '@/components/BottomNav';
import DeliveryCard from '@/components/DeliveryCard';

export default function HomePage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [user, setUser] = useState<{ email: string; full_name?: string } | null>(null);
    const [deliveries, setDeliveries] = useState<Delivery[]>([]);
    const [loading, setLoading] = useState(true);
    const [showToast, setShowToast] = useState(false);
    const [toastMessage, setToastMessage] = useState('');
    const supabaseRef = useRef(createBrowserClient());
    const userIdRef = useRef<string | null>(null);
    const toastShownRef = useRef(false);

    // Get time-appropriate greeting
    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return 'Good morning';
        if (hour < 17) return 'Good afternoon';
        return 'Good evening';
    };

    const loadData = useCallback(async () => {
        try {
            const supabase = supabaseRef.current;

            // Check auth
            const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
            if (authError || !authUser) {
                console.error('[Home] Auth error:', authError);
                router.push('/login');
                return;
            }

            userIdRef.current = authUser.id;

            // Toast is now handled separately to avoid repeating

            // Get user profile from db
            const { data: profile, error: profileError } = await supabase
                .from('users')
                .select('email, full_name')
                .eq('id', authUser.id)
                .single();

            if (profileError) {
                console.warn('[Home] Profile fetch error:', profileError);
            }

            // Fallback to name from auth metadata (Google/Signup)
            const authName = authUser.user_metadata?.full_name || authUser.user_metadata?.name;

            setUser({
                email: profile?.email || authUser.email || '',
                full_name: profile?.full_name || authName
            });

            // Get active deliveries through API to ensure consistency with operator dashboard
            // Use the same filtering logic as operator dashboard: ['pending', 'assigned', 'in_transit']
            try {
                // Get the access token to pass to API
                const { data: { session } } = await supabase.auth.getSession();
                const accessToken = session?.access_token;

                const deliveriesRes = await fetch('/api/deliveries', {
                    cache: 'no-store',
                    headers: accessToken ? {
                        'Authorization': `Bearer ${accessToken}`
                    } : {}
                });
                if (deliveriesRes.ok) {
                    const allDeliveries: Delivery[] = await deliveriesRes.json();

                    // Filter to match operator dashboard EXACTLY: only active deliveries for this user
                    // Exclude 'delivered' and 'cancelled' to match operator dashboard logic
                    const activeDeliveries = allDeliveries
                        .filter((d: Delivery) => {
                            const isUserDelivery = d.user_id === authUser.id;
                            const isActiveStatus = ['pending', 'assigned', 'in_transit'].includes(d.status);
                            return isUserDelivery && isActiveStatus;
                        })
                        .sort((a: Delivery, b: Delivery) =>
                            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
                        );

                    console.log('[Home] Total deliveries from API:', allDeliveries.length);
                    console.log('[Home] User deliveries:', allDeliveries.filter(d => d.user_id === authUser.id).length);
                    console.log('[Home] Active deliveries (filtered):', activeDeliveries.length);
                    console.log('[Home] Delivery details:', activeDeliveries.map((d: Delivery) => ({
                        id: d.id.slice(0, 8),
                        status: d.status,
                        created_at: d.created_at
                    })));

                    setDeliveries(activeDeliveries);
                } else {
                    const errorText = await deliveriesRes.text();
                    console.error('[Home] API fetch failed:', deliveriesRes.status, errorText);
                    // Fallback to direct query if API fails
                    const { data: deliveriesData, error: deliveriesError } = await supabase
                        .from('deliveries')
                        .select('*')
                        .eq('user_id', authUser.id)
                        .in('status', ['pending', 'assigned', 'in_transit'])
                        .order('created_at', { ascending: false });

                    if (deliveriesError) {
                        console.error('[Home] Fallback query error:', deliveriesError);
                    } else {
                        console.log('[Home] Fallback loaded:', deliveriesData?.length || 0, 'deliveries');
                        setDeliveries(deliveriesData || []);
                    }
                }
            } catch (fetchError) {
                console.error('[Home] Fetch error:', fetchError);
                // Fallback to direct query
                const { data: deliveriesData, error: deliveriesError } = await supabase
                    .from('deliveries')
                    .select('*')
                    .eq('user_id', authUser.id)
                    .in('status', ['pending', 'assigned', 'in_transit'])
                    .order('created_at', { ascending: false });

                if (!deliveriesError) {
                    setDeliveries(deliveriesData || []);
                }
            }

            setLoading(false);
        } catch (error) {
            console.error('[Home] Load data error:', error);
            setLoading(false);
        }
    }, [router, searchParams]);

    // Handle login success toast - runs only once on mount
    useEffect(() => {
        const loginSuccess = searchParams.get('login');
        if (loginSuccess === 'success' && !toastShownRef.current) {
            toastShownRef.current = true;
            setToastMessage('Successfully logged in!');
            setShowToast(true);
            setTimeout(() => setShowToast(false), 3000);
            // Clear the URL parameter to prevent showing again on page refresh
            window.history.replaceState({}, '', '/home');
        }
    }, [searchParams]);

    useEffect(() => {
        let subscription: { unsubscribe: () => void } | null = null;
        let interval: NodeJS.Timeout | null = null;

        const setupSubscriptions = async () => {
            // First load data to get userId
            await loadData();

            // Wait a bit for userIdRef to be set
            await new Promise(resolve => setTimeout(resolve, 100));

            const supabase = supabaseRef.current;
            const userId = userIdRef.current;

            if (!userId) {
                console.warn('[Home] No userId available, skipping real-time subscription');
                // Still set up polling
                interval = setInterval(() => {
                    loadData();
                }, 3000);
                return;
            }

            console.log('[Home] Setting up real-time subscription for user:', userId);

            // Subscribe to real-time updates for deliveries
            subscription = supabase
                .channel(`user-deliveries-${userId}`)
                // @ts-expect-error - postgres_changes is valid but not in types
                .on('postgres_changes', {
                    event: '*',
                    schema: 'public',
                    table: 'deliveries',
                    filter: `user_id=eq.${userId}`
                }, (payload: { eventType: string; new: { id: string } }) => {
                    console.log('[Home] Real-time update received:', payload.eventType, payload.new?.id);
                    // Refetch deliveries when changes occur
                    loadData();
                })
                .subscribe((status) => {
                    console.log('[Home] Subscription status:', status);
                    if (status === 'SUBSCRIBED') {
                        console.log('[Home] Successfully subscribed to real-time updates');
                    } else if (status === 'CHANNEL_ERROR') {
                        console.error('[Home] Subscription error, falling back to polling');
                    }
                });

            // Poll every 3 seconds as backup (real-time might not work without proper RLS)
            interval = setInterval(() => {
                loadData();
            }, 3000);
        };

        setupSubscriptions();

        // Refresh when window gains focus
        const handleFocus = () => {
            console.log('[Home] Window focused, refreshing data');
            loadData();
        };
        window.addEventListener('focus', handleFocus);

        // Listen for custom refresh event (from payment success)
        const handleRefresh = () => {
            console.log('[Home] Custom refresh event received');
            loadData();
        };
        window.addEventListener('delivery-created', handleRefresh);

        return () => {
            if (subscription) {
                subscription.unsubscribe();
            }
            if (interval) {
                clearInterval(interval);
            }
            window.removeEventListener('focus', handleFocus);
            window.removeEventListener('delivery-created', handleRefresh);
        };
    }, [router, searchParams, loadData]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2" style={{ borderColor: 'var(--primary)' }}></div>
            </div>
        );
    }

    // Get a clean display name (avoid showing UIDs or long strings)
    const getDisplayName = () => {
        const name = user?.full_name;

        // If no name, use first part of email or generic greeting
        if (!name) {
            const emailPart = user?.email?.split('@')[0];
            // Avoid long email prefixes too
            if (emailPart && emailPart.length <= 15) {
                return emailPart.charAt(0).toUpperCase() + emailPart.slice(1);
            }
            return 'there';
        }

        // Check if name looks like a UID (long alphanumeric with dashes)
        if (name.match(/^[a-f0-9-]{20,}$/i)) {
            const emailPart = user?.email?.split('@')[0];
            if (emailPart && emailPart.length <= 15) {
                return emailPart.charAt(0).toUpperCase() + emailPart.slice(1);
            }
            return 'there';
        }

        // Get first name only, and limit length
        const firstName = name.split(' ')[0];
        if (firstName.length > 15) {
            return firstName.slice(0, 15);
        }

        return firstName;
    };

    const firstName = getDisplayName();

    return (
        <div className="min-h-screen pb-24">
            {/* Toast notification */}
            {showToast && (
                <div
                    className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 text-white px-6 py-4 rounded-xl shadow-lg flex items-center gap-3"
                    style={{ backgroundColor: 'var(--success)' }}
                >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="font-medium">{toastMessage}</span>
                </div>
            )}

            {/* Header - Teal gradient */}
            <div
                className="text-white px-5 pt-14 pb-10 rounded-b-3xl"
                style={{ background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%)' }}
            >
                <div className="flex items-center gap-3 mb-5">
                    <div className="w-14 h-14 bg-white rounded-xl flex items-center justify-center overflow-hidden shadow-md">
                        <Image
                            src="/udd-logo-icon.png"
                            alt="UDD"
                            width={100}
                            height={100}
                            className="w-full h-full object-contain"
                        />
                    </div>
                    <h1 className="text-xl font-bold">Universal Delivery Drone</h1>
                </div>
                <h2 className="text-3xl font-bold">
                    {getGreeting()}, {firstName}!
                </h2>
                <p className="text-white/80 mt-2 text-lg">How can we help you today?</p>
            </div>

            {/* Main content */}
            <div className="px-5 -mt-6">
                {/* Big Request Button */}
                <Link href="/new-delivery" className="btn-giant mb-8">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                        />
                    </svg>
                    <span>Request a Drone Delivery</span>
                </Link>

                {/* Active deliveries */}
                <div>
                    <h2 className="text-xl font-semibold mb-4">Your Deliveries</h2>
                    {deliveries.length === 0 ? (
                        <div className="card text-center py-10">
                            <div className="text-gray-300 mb-3">
                                <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                                </svg>
                            </div>
                            <p className="text-gray-500 text-lg font-medium">No active deliveries</p>
                            <p className="text-gray-400 mt-1">Tap the button above to get started</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
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
