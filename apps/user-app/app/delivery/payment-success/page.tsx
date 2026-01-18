'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createBrowserClient } from '@udd/shared';

export default function PaymentSuccessPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const sessionId = searchParams.get('session_id');
    const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
    const [message, setMessage] = useState('Verifying payment...');

    useEffect(() => {
        const processPayment = async () => {
            if (!sessionId) {
                setStatus('error');
                setMessage('Invalid payment session');
                setTimeout(() => router.push('/dashboard'), 2000);
                return;
            }

            try {
                const supabase = createBrowserClient();

                // Check if user is authenticated
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) {
                    setStatus('error');
                    setMessage('Please log in to continue');
                    setTimeout(() => router.push('/login'), 2000);
                    return;
                }

                setMessage('Creating your delivery...');

                // Call API to verify payment and create delivery
                const response = await fetch('/api/payment/verify', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ sessionId }),
                });

                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.error || 'Failed to process payment');
                }

                console.log('[PaymentSuccess] Delivery created:', data.deliveryId);

                setStatus('success');
                setMessage('Delivery created! Redirecting...');

                // Dispatch custom event to notify dashboard to refresh
                if (typeof window !== 'undefined') {
                    window.dispatchEvent(new CustomEvent('delivery-created', { 
                        detail: { deliveryId: data.deliveryId } 
                    }));
                    console.log('[PaymentSuccess] Dispatched delivery-created event');
                }

                // Redirect to tracking page
                setTimeout(() => {
                    router.push(`/delivery/${data.deliveryId}`);
                }, 1000);

            } catch (error) {
                console.error('[PaymentSuccess] Payment processing error:', error);
                setStatus('error');
                setMessage('Something went wrong. Please check your deliveries.');
                
                // Still try to refresh dashboard in case delivery was created
                if (typeof window !== 'undefined') {
                    window.dispatchEvent(new CustomEvent('delivery-created'));
                }
                
                setTimeout(() => router.push('/dashboard'), 3000);
            }
        };

        processPayment();
    }, [sessionId, router]);

    return (
        <div className="min-h-screen flex items-center justify-center p-5" style={{ backgroundColor: 'var(--bg)' }}>
            <div className="text-center max-w-sm">
                {status === 'processing' && (
                    <>
                        <div className="animate-spin rounded-full h-16 w-16 border-4 mx-auto mb-6"
                            style={{ borderColor: 'var(--primary-light)', borderTopColor: 'var(--primary)' }}>
                        </div>
                        <h1 className="text-2xl font-bold mb-2">Processing Payment</h1>
                        <p className="text-gray-500">{message}</p>
                    </>
                )}

                {status === 'success' && (
                    <>
                        <div className="w-20 h-20 rounded-full mx-auto mb-6 flex items-center justify-center"
                            style={{ backgroundColor: 'var(--success)' }}>
                            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                        <h1 className="text-2xl font-bold mb-2" style={{ color: 'var(--success)' }}>Payment Successful!</h1>
                        <p className="text-gray-500">{message}</p>
                    </>
                )}

                {status === 'error' && (
                    <>
                        <div className="w-20 h-20 rounded-full mx-auto mb-6 flex items-center justify-center"
                            style={{ backgroundColor: 'var(--warning)' }}>
                            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </div>
                        <h1 className="text-2xl font-bold mb-2">Oops!</h1>
                        <p className="text-gray-500">{message}</p>
                    </>
                )}
            </div>
        </div>
    );
}
