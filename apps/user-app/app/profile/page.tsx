'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@/lib/supabase';
import BottomNav from '@/components/BottomNav';

interface UserProfile {
    email: string;
    full_name?: string;
    phone?: string;
}

export default function ProfilePage() {
    const router = useRouter();
    const [user, setUser] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [showNotificationModal, setShowNotificationModal] = useState(false);
    const [showHelpModal, setShowHelpModal] = useState(false);
    const [notifications, setNotifications] = useState({
        deliveryUpdates: true,
        promotions: false,
        news: false,
    });
    const [isEditingPhone, setIsEditingPhone] = useState(false);
    const [phoneValue, setPhoneValue] = useState('');
    const [phoneError, setPhoneError] = useState('');
    const [saving, setSaving] = useState(false);

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
                .select('email, full_name, phone')
                .eq('id', authUser.id)
                .single();

            // Get name from auth metadata if not in profile
            const authName = authUser.user_metadata?.full_name
                || authUser.user_metadata?.name
                || authUser.email?.split('@')[0];

            setUser({
                email: profile?.email || authUser.email || '',
                full_name: profile?.full_name || authName || null,
                phone: profile?.phone || '',
            });
            if (profile?.phone) {
                setPhoneValue(profile.phone);
            }
            setLoading(false);
        };

        loadProfile();
    }, [router]);

    const handleLogout = async () => {
        const supabase = createBrowserClient();
        await supabase.auth.signOut();
        router.push('/login');
    };

    const handlePhoneUpdate = async () => {
        // Simple Dutch phone validation: 10 digits starting with 0
        const cleaned = phoneValue.replace(/\s/g, '');
        const regex = /^(?:06[1-9][0-9]{7}|0[1-9][0-9]{8})$/;

        if (!regex.test(cleaned)) {
            setPhoneError('Please enter a valid 10-digit Dutch phone number');
            return;
        }

        setSaving(true);
        const supabase = createBrowserClient();
        const { data: { user: authUser } } = await supabase.auth.getUser();

        if (authUser) {
            // Use API route to bypass RLS
            const res = await fetch('/api/profile/update', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: authUser.id,
                    email: authUser.email || '',
                    phone: cleaned,
                    fullName: authUser.user_metadata?.full_name || authUser.user_metadata?.name || null,
                }),
            });

            if (!res.ok) {
                const error = await res.json();
                console.error('Phone update error:', error);
                alert('Failed to update phone number: ' + error.error);
            } else {
                setUser(prev => prev ? { ...prev, phone: cleaned } : null);
                setPhoneValue(cleaned);
                setIsEditingPhone(false);
                setPhoneError('');
            }
        }
        setSaving(false);
    };

    const handleProfilePictureUpload = () => {
        // Create a file input element
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = async (e) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (file) {
                // For now, show a toast that upload is processing
                alert(`Selected: ${file.name}\n\nProfile picture upload will be fully integrated in a future update.`);
            }
        };
        input.click();
    };

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

        // If no name or name looks like a UID
        if (!name || name.match(/^[a-f0-9-]{20,}$/i)) {
            const emailPart = user?.email?.split('@')[0];
            if (emailPart && emailPart.length <= 20) {
                return emailPart.charAt(0).toUpperCase() + emailPart.slice(1);
            }
            return 'User';
        }

        // Limit very long names
        return name.length > 25 ? name.slice(0, 25) + '...' : name;
    };

    const displayName = getDisplayName();
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
                    <div className="flex items-center gap-4 mb-6">
                        <div className="relative">
                            <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ backgroundColor: 'var(--primary-light)' }}>
                                <span className="text-2xl font-bold" style={{ color: 'var(--primary)' }}>
                                    {initial}
                                </span>
                            </div>
                            {/* Edit Profile Picture Button */}
                            <button
                                className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-white border-2 flex items-center justify-center shadow-sm hover:bg-gray-50 transition-colors"
                                style={{ borderColor: 'var(--primary)' }}
                                onClick={handleProfilePictureUpload}
                                aria-label="Change profile picture"
                            >
                                <svg className="w-3.5 h-3.5" style={{ color: 'var(--primary)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                            </button>
                        </div>
                        <div>
                            <p className="font-semibold text-lg">{displayName}</p>
                            <p className="text-gray-500 text-sm">{user?.email}</p>
                        </div>
                    </div>

                    <div className="pt-4 border-t">
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Phone Number</h3>
                            {!isEditingPhone && (
                                <button
                                    onClick={() => setIsEditingPhone(true)}
                                    className="text-xs font-bold text-teal-600 hover:text-teal-700"
                                >
                                    Edit
                                </button>
                            )}
                        </div>

                        {isEditingPhone ? (
                            <div className="space-y-3">
                                <input
                                    type="tel"
                                    value={phoneValue}
                                    onChange={(e) => setPhoneValue(e.target.value)}
                                    placeholder="e.g. 0612345678"
                                    className={`w-full px-4 py-3 rounded-xl border focus:ring-2 outline-none transition-all ${phoneError ? 'border-red-500 ring-red-100' : 'focus:ring-teal-100'
                                        }`}
                                />
                                {phoneError && <p className="text-red-500 text-xs">{phoneError}</p>}
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => {
                                            setIsEditingPhone(false);
                                            setPhoneValue(user?.phone || '');
                                            setPhoneError('');
                                        }}
                                        className="flex-1 py-2 text-sm font-medium bg-gray-100 rounded-lg hover:bg-gray-200"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handlePhoneUpdate}
                                        disabled={saving}
                                        className="flex-1 py-2 text-sm font-bold text-white bg-teal-600 rounded-lg hover:bg-teal-700 disabled:opacity-50"
                                    >
                                        {saving ? 'Saving...' : 'Save'}
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center">
                                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1.01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                    </svg>
                                </div>
                                <p className="font-semibold text-gray-900">
                                    {user?.phone || <span className="text-gray-400 font-normal">Not set (needed for receiving)</span>}
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Actions */}
                <div className="card space-y-2">
                    <button
                        onClick={() => setShowNotificationModal(true)}
                        className="w-full text-left py-3 px-2 hover:bg-gray-50 rounded-lg flex items-center justify-between"
                    >
                        <span>Notification Settings</span>
                        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                    </button>
                    <button
                        onClick={() => setShowHelpModal(true)}
                        className="w-full text-left py-3 px-2 hover:bg-gray-50 rounded-lg flex items-center justify-between"
                    >
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

            {/* Notification Settings Modal */}
            {showNotificationModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-bold">Notification Settings</h2>
                            <button
                                onClick={() => setShowNotificationModal(false)}
                                className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        <div className="space-y-4">
                            <label className="flex items-center justify-between p-3 bg-gray-50 rounded-xl cursor-pointer">
                                <div>
                                    <p className="font-medium">Delivery Updates</p>
                                    <p className="text-sm text-gray-500">Get notified about your deliveries</p>
                                </div>
                                <input
                                    type="checkbox"
                                    checked={notifications.deliveryUpdates}
                                    onChange={(e) => setNotifications({ ...notifications, deliveryUpdates: e.target.checked })}
                                    className="w-5 h-5 rounded accent-[#006B6B]"
                                />
                            </label>
                            <label className="flex items-center justify-between p-3 bg-gray-50 rounded-xl cursor-pointer">
                                <div>
                                    <p className="font-medium">Promotions</p>
                                    <p className="text-sm text-gray-500">Receive offers and discounts</p>
                                </div>
                                <input
                                    type="checkbox"
                                    checked={notifications.promotions}
                                    onChange={(e) => setNotifications({ ...notifications, promotions: e.target.checked })}
                                    className="w-5 h-5 rounded accent-[#006B6B]"
                                />
                            </label>
                            <label className="flex items-center justify-between p-3 bg-gray-50 rounded-xl cursor-pointer">
                                <div>
                                    <p className="font-medium">News & Updates</p>
                                    <p className="text-sm text-gray-500">Stay informed about UDD</p>
                                </div>
                                <input
                                    type="checkbox"
                                    checked={notifications.news}
                                    onChange={(e) => setNotifications({ ...notifications, news: e.target.checked })}
                                    className="w-5 h-5 rounded accent-[#006B6B]"
                                />
                            </label>
                        </div>
                        <button
                            onClick={() => setShowNotificationModal(false)}
                            className="btn-primary w-full mt-6"
                        >
                            Save Settings
                        </button>
                    </div>
                </div>
            )}

            {/* Help & Support Modal */}
            {showHelpModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-bold">Help & Support</h2>
                            <button
                                onClick={() => setShowHelpModal(false)}
                                className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        <div className="space-y-4">
                            <div className="p-4 bg-gray-50 rounded-xl">
                                <div className="flex items-center gap-3 mb-2">
                                    <svg className="w-5 h-5 text-primary" style={{ color: 'var(--primary)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                    </svg>
                                    <p className="font-medium">Email Support</p>
                                </div>
                                <p className="text-sm text-gray-500">support@udd.com</p>
                            </div>
                            <div className="p-4 bg-gray-50 rounded-xl">
                                <div className="flex items-center gap-3 mb-2">
                                    <svg className="w-5 h-5 text-primary" style={{ color: 'var(--primary)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                    </svg>
                                    <p className="font-medium">Phone Support</p>
                                </div>
                                <p className="text-sm text-gray-500">+1 (800) UDD-HELP</p>
                            </div>
                            <div className="p-4 bg-gray-50 rounded-xl">
                                <div className="flex items-center gap-3 mb-2">
                                    <svg className="w-5 h-5 text-primary" style={{ color: 'var(--primary)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    <p className="font-medium">FAQs</p>
                                </div>
                                <p className="text-sm text-gray-500">Visit our help center for answers</p>
                            </div>
                        </div>
                        <button
                            onClick={() => setShowHelpModal(false)}
                            className="btn-secondary w-full mt-6"
                        >
                            Close
                        </button>
                    </div>
                </div>
            )}

            <BottomNav />
        </div>
    );
}

