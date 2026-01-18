'use client';

import { useState, useRef, useEffect } from 'react';

interface HoldToUnlockProps {
    onUnlock: () => void;
    holdDuration?: number; // in milliseconds
    disabled?: boolean;
}

export default function HoldToUnlock({
    onUnlock,
    holdDuration = 2000,
    disabled = false
}: HoldToUnlockProps) {
    const [progress, setProgress] = useState(0);
    const [isHolding, setIsHolding] = useState(false);
    const intervalRef = useRef<NodeJS.Timeout | null>(null);
    const startTimeRef = useRef<number>(0);

    const startHold = () => {
        if (disabled) return;
        setIsHolding(true);
        startTimeRef.current = Date.now();

        intervalRef.current = setInterval(() => {
            const elapsed = Date.now() - startTimeRef.current;
            const newProgress = Math.min((elapsed / holdDuration) * 100, 100);
            setProgress(newProgress);

            if (newProgress >= 100) {
                stopHold();
                onUnlock();
            }
        }, 50);
    };

    const stopHold = () => {
        setIsHolding(false);
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }
        // Reset progress if not completed
        if (progress < 100) {
            setProgress(0);
        }
    };

    useEffect(() => {
        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
        };
    }, []);

    return (
        <div className="space-y-3">
            <button
                onMouseDown={startHold}
                onMouseUp={stopHold}
                onMouseLeave={stopHold}
                onTouchStart={startHold}
                onTouchEnd={stopHold}
                disabled={disabled}
                className={`
                    w-full rounded-2xl font-bold text-xl
                    transition-all duration-200 relative overflow-hidden
                    ${disabled
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        : 'bg-gradient-to-r from-teal-600 to-teal-700 text-white shadow-lg hover:shadow-xl'
                    }
                `}
                style={{ minHeight: '80px', padding: '20px 24px' }}
                aria-label="Hold to unlock storage compartment"
                role="button"
            >
                {/* Progress bar background */}
                <div
                    className="absolute inset-0 bg-teal-400 transition-all duration-100"
                    style={{
                        width: `${progress}%`,
                        opacity: isHolding ? 0.4 : 0
                    }}
                />

                {/* Button content */}
                <div className="relative z-10 flex items-center justify-center gap-3">
                    <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z"
                        />
                    </svg>
                    <span>
                        {isHolding
                            ? `Hold... ${Math.round(progress)}%`
                            : 'Hold to Unlock'
                        }
                    </span>
                </div>
            </button>

            {/* Progress indicator */}
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                    className="h-full bg-teal-500 transition-all duration-100 rounded-full"
                    style={{ width: `${progress}%` }}
                />
            </div>

            <p className="text-center text-sm text-gray-500">
                Press and hold for 2 seconds to unlock
            </p>
        </div>
    );
}
