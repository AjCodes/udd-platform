'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@udd/shared';
import BottomNav from '@/components/BottomNav';

interface UserProfile {
    email: string;
    full_name?: string;
}

export default function ProfilePage() {
    const router = useRouter();
    const [user, setUser] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadProfile = async () => {
            const supabase = createBrowserClient();

            const { data: { user: authUser } } = await supabase.auth.getUser();
            if (!authUser) {
                router.push('/login');
                return;
            }

            // Try to get from users table first
            const { data: profile } = await supabase
                .from('users')
                .select('email, full_name')
                .eq('id', authUser.id)
                .single();

            // Get name from auth metadata if not in profile
            const authName = authUser.user_metadata?.full_name
                || authUser.user_metadata?.name
                || authUser.email?.split('@')[0];

            setUser({
                email: profile?.email || authUser.email || '',
                full_name: profile?.full_name || authName || null,
            });
            setLoading(false);
        };

        loadProfile();
    }, [router]);

    const handleLogout = async () => {
        const supabase = createBrowserClient();
        await supabase.auth.signOut();
        router.push('/login');
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2" style={{ borderColor: 'var(--primary)' }}></div>
            </div>
        );
    }

    const displayName = user?.full_name || user?.email?.split('@')[0] || 'User';
    const initial = displayName.charAt(0).toUpperCase();

    return (
        <div className="min-h-screen pb-20">
            {/* Header */}
            <div className="bg-white border-b px-4 py-4">
                <h1 className="text-xl font-semibold">Profile</h1>
            </div>

            <div className="p-4 space-y-4">
                {/* User info */}
                <div className="card">
                    <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ backgroundColor: 'var(--primary-light)' }}>
                            <span className="text-2xl font-bold" style={{ color: 'var(--primary)' }}>
                                {initial}
                            </span>
                        </div>
                        <div>
                            <p className="font-semibold text-lg">{displayName}</p>
                            <p className="text-gray-500">{user?.email}</p>
                        </div>
                    </div>
                </div>

                {/* Actions */}
                <div className="card space-y-2">
                    <button className="w-full text-left py-3 px-2 hover:bg-gray-50 rounded-lg flex items-center justify-between">
                        <span>Notification Settings</span>
                        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                    </button>
                    <button className="w-full text-left py-3 px-2 hover:bg-gray-50 rounded-lg flex items-center justify-between">
                        <span>Help & Support</span>
                        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                    </button>
                </div>

                {/* Logout */}
                <button
                    onClick={handleLogout}
                    className="w-full py-3 text-red-500 font-medium hover:bg-red-50 rounded-lg"
                >
                    Sign Out
                </button>
            </div>

            <BottomNav />
        </div>
    );
}
