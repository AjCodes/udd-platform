'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@shared/supabase';

export default function LoginPage() {
    const router = useRouter();
    const [isSignUp, setIsSignUp] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [fullName, setFullName] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

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

                // Create user profile
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

            router.push('/dashboard');
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
        <div className="min-h-screen flex items-center justify-center px-4">
            <div className="w-full max-w-md">
                {/* Logo */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-sky-100 rounded-full mb-4">
                        <svg className="w-8 h-8 text-sky-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                        </svg>
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900">UDD Delivery</h1>
                    <p className="text-gray-500 mt-1">Drone delivery made easy</p>
                </div>

                {/* Form */}
                <div className="card">
                    <h2 className="text-xl font-semibold mb-6">
                        {isSignUp ? 'Create Account' : 'Sign In'}
                    </h2>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {isSignUp && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Full Name
                                </label>
                                <input
                                    type="text"
                                    className="input"
                                    placeholder="John Doe"
                                    value={fullName}
                                    onChange={(e) => setFullName(e.target.value)}
                                    required={isSignUp}
                                />
                            </div>
                        )}

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Email
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
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Password
                            </label>
                            <input
                                type="password"
                                className="input"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
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
                            {loading ? 'Please wait...' : isSignUp ? 'Create Account' : 'Sign In'}
                        </button>
                    </form>

                    <div className="relative my-6">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-gray-200"></div>
                        </div>
                        <div className="relative flex justify-center text-sm">
                            <span className="px-2 bg-white text-gray-500">or</span>
                        </div>
                    </div>

                    {/* Google Button */}
                    <button
                        onClick={handleGoogleLogin}
                        type="button"
                        className="w-full flex items-center justify-center gap-3 py-3 px-4 border border-gray-300 rounded-lg hover:bg-gray-50"
                    >
                        <svg className="w-5 h-5" viewBox="0 0 24 24">
                            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                        </svg>
                        Continue with Google
                    </button>

                    <div className="mt-6 text-center">
                        <button
                            onClick={() => setIsSignUp(!isSignUp)}
                            className="text-sky-500 hover:text-sky-600 text-sm"
                        >
                            {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Create one"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
