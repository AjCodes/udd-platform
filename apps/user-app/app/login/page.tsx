'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createBrowserClient } from '@/lib/supabase';

export default function LoginPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [isSignUp, setIsSignUp] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [fullName, setFullName] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    // Check if coming from onboarding with signup=true
    useEffect(() => {
        if (searchParams.get('signup') === 'true') {
            setIsSignUp(true);
        }
    }, [searchParams]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const supabase = createBrowserClient();

            if (isSignUp) {
                const { error: signUpError } = await supabase.auth.signUp({
                    email,
                    password,
                    options: {
                        data: { full_name: fullName },
                    },
                });

                if (signUpError) throw signUpError;

                const { data: { user } } = await supabase.auth.getUser();
                if (user) {
                    await supabase.from('users').insert({
                        id: user.id,
                        email: user.email,
                        full_name: fullName,
                        role: 'customer',
                    });
                }
            } else {
                const { error: signInError } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                });

                if (signInError) throw signInError;
            }

            router.push('/home?login=success');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Something went wrong');
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleLogin = async () => {
        setError('');
        try {
            const supabase = createBrowserClient();
            const { error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: `${window.location.origin}/auth/callback`,
                },
            });

            if (error) throw error;
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Google login failed');
        }
    };

    return (
        <div className="min-h-screen flex flex-col" style={{ backgroundColor: 'var(--bg)' }}>
            {/* Header - matching onboarding */}
            <div className="flex items-center justify-between p-4 md:p-6">
                <div className="flex items-center gap-2">
                    <img
                        src="/udd-logo-icon.png"
                        alt="UDD Logo"
                        className="w-16 h-16 object-contain"
                    />
                    <span className="text-sm font-semibold text-gray-600">Universal Delivery Drone</span>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 flex flex-col items-center justify-center px-4 py-8">
                <div className="w-full max-w-md">
                    {/* Main Login Card */}
                    <div className="bg-white rounded-2xl shadow-sm border p-8" style={{ borderColor: 'var(--border)' }}>
                        <div className="mb-8 text-center">
                            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
                                {isSignUp ? 'Create your account' : 'Welcome back'}
                            </h1>
                            <p className="text-gray-500">
                                {isSignUp ? 'Start using drone delivery today' : 'Sign in to continue to UDD'}
                            </p>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-5">
                            {isSignUp && (
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                                        Full Name
                                    </label>
                                    <input
                                        type="text"
                                        className="input"
                                        placeholder="Enter your full name"
                                        value={fullName}
                                        onChange={(e) => setFullName(e.target.value)}
                                        required={isSignUp}
                                    />
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                    Email Address
                                </label>
                                <input
                                    type="email"
                                    className="input"
                                    placeholder="you@example.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                />
                            </div>

                            <div>
                                <div className="flex justify-between items-center mb-2">
                                    <label className="block text-sm font-semibold text-gray-700">
                                        Password
                                    </label>
                                    {!isSignUp && (
                                        <button
                                            type="button"
                                            className="text-sm font-medium transition-colors"
                                            style={{ color: '#006B6B' }}
                                        >
                                            Forgot password?
                                        </button>
                                    )}
                                </div>
                                <input
                                    type="password"
                                    className="input"
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    minLength={6}
                                />
                            </div>

                            {error && (
                                <div className="p-4 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm font-medium">
                                    {error}
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={loading}
                                className="btn-primary w-full"
                            >
                                {loading ? 'Processing...' : (isSignUp ? 'Create Account' : 'Sign In')}
                            </button>
                        </form>

                        <div className="relative my-8">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t" style={{ borderColor: 'var(--border)' }}></div>
                            </div>
                            <div className="relative flex justify-center text-xs font-bold text-gray-400">
                                <span className="px-4 bg-white uppercase tracking-widest">Or continue with</span>
                            </div>
                        </div>

                        <button
                            onClick={handleGoogleLogin}
                            className="btn-secondary w-full flex items-center justify-center gap-3"
                        >
                            <svg className="w-5 h-5" viewBox="0 0 24 24">
                                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                            </svg>
                            Google
                        </button>

                        <div className="mt-8 text-center">
                            <button
                                onClick={() => setIsSignUp(!isSignUp)}
                                className="text-gray-500 hover:text-gray-700 text-sm font-semibold transition-colors"
                            >
                                {isSignUp ? 'Already have an account? ' : 'New to UDD? '}
                                <span style={{ color: '#006B6B' }}>
                                    {isSignUp ? 'Sign In' : 'Create Account'}
                                </span>
                            </button>
                        </div>
                    </div>

                    <p className="mt-8 text-center text-gray-400 text-xs font-semibold uppercase tracking-widest">
                        &copy; 2026 Universal Delivery Drone
                    </p>
                </div>
            </div>
        </div>
    );
}

