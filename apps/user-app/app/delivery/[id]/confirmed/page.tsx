'use client';

import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

export default function DeliveryConfirmedPage() {
    const searchParams = useSearchParams();
    const pin = searchParams.get('pin') || '------';

    const handleShare = async () => {
        const shareData = {
            title: 'UDD Delivery PIN',
            text: `Your drone delivery PIN is: ${pin}. Use this to unlock the storage compartment.`,
        };

        if (navigator.share) {
            try {
                await navigator.share(shareData);
            } catch {
                // User cancelled or error
            }
        } else {
            // Fallback: copy to clipboard
            await navigator.clipboard.writeText(shareData.text);
            alert('PIN copied to clipboard!');
        }
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center px-4">
            {/* Success icon */}
            <div className="w-20 h-20 rounded-full flex items-center justify-center mb-6" style={{ backgroundColor: 'var(--primary-light)' }}>
                <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: 'var(--primary)' }}>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
            </div>

            <h1 className="text-2xl font-bold text-gray-900 mb-2">Request Submitted!</h1>
            <p className="text-gray-500 text-center mb-8">
                Your delivery request has been created successfully.
            </p>

            {/* PIN display */}
            <div className="rounded-2xl p-6 text-center mb-6 w-full max-w-sm border-2" style={{ backgroundColor: 'var(--primary-light)', borderColor: 'var(--primary)' }}>
                <p className="text-sm font-medium mb-2" style={{ color: 'var(--primary)' }}>UNLOCK PIN</p>
                <p className="text-4xl font-bold tracking-widest font-mono" style={{ color: 'var(--primary-dark)' }}>{pin}</p>
            </div>

            <p className="text-sm text-gray-500 text-center mb-6 max-w-sm">
                Share this PIN with the receiver to unlock the storage compartment when the drone arrives.
            </p>

            {/* Share button */}
            <button
                onClick={handleShare}
                className="btn-secondary flex items-center gap-2 mb-4"
            >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                </svg>
                Share PIN
            </button>

            <Link href="/dashboard" className="font-medium hover:underline" style={{ color: 'var(--primary)' }}>
                Back to Dashboard
            </Link>
        </div>
    );
}
