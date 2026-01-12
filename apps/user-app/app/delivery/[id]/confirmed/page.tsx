'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';

export default function DeliveryConfirmedPage() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const pin = searchParams.get('pin') || '------';

    const handleShare = async () => {
        const shareData = {
            title: 'UDD Delivery PIN',
            text: `Your drone delivery PIN is: ${pin}. Use this to unlock the storage compartment.`,
        };

        if (navigator.share) {
            try {
                await navigator.share(shareData);
            } catch (err) {
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
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-6">
                <svg className="w-10 h-10 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
            </div>

            <h1 className="text-2xl font-bold text-gray-900 mb-2">Request Submitted!</h1>
            <p className="text-gray-500 text-center mb-8">
                Your delivery request has been created successfully.
            </p>

            {/* PIN display */}
            <div className="bg-sky-50 border-2 border-sky-200 rounded-2xl p-6 text-center mb-6 w-full max-w-sm">
                <p className="text-sm text-sky-600 font-medium mb-2">UNLOCK PIN</p>
                <p className="text-4xl font-bold text-sky-700 tracking-widest font-mono">{pin}</p>
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

            <Link href="/dashboard" className="text-sky-500 hover:text-sky-600">
                Back to Dashboard
            </Link>
        </div>
    );
}
