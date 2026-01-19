'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

const ONBOARDING_STEPS = [
    {
        id: 'welcome',
        title: 'Fast, Autonomous Delivery',
        subtitle: 'Get anything delivered by drone in minutes',
        icon: (
            <svg className="w-32 h-32 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {/* Drone icon */}
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                <circle cx="12" cy="8" r="2" strokeWidth={1.5} />
                <path strokeLinecap="round" strokeWidth={1.5} d="M5 8h3M16 8h3M8 5V3M16 5V3" />
            </svg>
        ),
        illustration: (
            <div className="relative w-48 h-48 mx-auto">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-primary/5 rounded-full animate-pulse" />
                <svg className="w-full h-full text-primary" viewBox="0 0 100 100" fill="none">
                    {/* Simplified drone illustration */}
                    <ellipse cx="50" cy="50" rx="12" ry="6" fill="currentColor" opacity="0.3" />
                    <rect x="44" y="52" width="12" height="16" rx="2" fill="currentColor" opacity="0.5" />
                    <line x1="20" y1="45" x2="38" y2="50" stroke="currentColor" strokeWidth="3" />
                    <line x1="80" y1="45" x2="62" y2="50" stroke="currentColor" strokeWidth="3" />
                    <circle cx="18" cy="44" r="6" stroke="currentColor" strokeWidth="2" fill="none" />
                    <circle cx="82" cy="44" r="6" stroke="currentColor" strokeWidth="2" fill="none" />
                    <line x1="35" y1="38" x2="45" y2="48" stroke="currentColor" strokeWidth="3" />
                    <line x1="65" y1="38" x2="55" y2="48" stroke="currentColor" strokeWidth="3" />
                    <circle cx="33" cy="36" r="6" stroke="currentColor" strokeWidth="2" fill="none" />
                    <circle cx="67" cy="36" r="6" stroke="currentColor" strokeWidth="2" fill="none" />
                    {/* Package */}
                    <rect x="42" y="70" width="16" height="14" rx="2" stroke="currentColor" strokeWidth="2" fill="currentColor" opacity="0.2" />
                    <line x1="42" y1="77" x2="58" y2="77" stroke="currentColor" strokeWidth="1.5" />
                    <line x1="50" y1="70" x2="50" y2="84" stroke="currentColor" strokeWidth="1.5" />
                </svg>
            </div>
        ),
    },
    {
        id: 'how-it-works',
        title: 'How It Works',
        subtitle: 'Three simple steps to get your delivery',
        steps: [
            {
                number: 1,
                title: 'Request',
                description: 'Choose pickup and dropoff locations',
                icon: (
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11l-3-3m0 0l-3 3m3-3v8" />
                    </svg>
                ),
            },
            {
                number: 2,
                title: 'Track',
                description: 'Watch your drone in real-time',
                icon: (
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                ),
            },
            {
                number: 3,
                title: 'Unlock',
                description: 'Use your PIN to open the compartment',
                icon: (
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
                    </svg>
                ),
            },
        ],
    },
    {
        id: 'safety',
        title: 'Safe & Secure',
        subtitle: 'Your packages are protected every step of the way',
        features: [
            {
                title: 'Live GPS Tracking',
                description: 'Know exactly where your package is',
                icon: (
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                ),
            },
            {
                title: 'Secure PIN Unlock',
                description: 'Only you can access your delivery',
                icon: (
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                ),
            },
            {
                title: 'Insured Deliveries',
                description: 'Every package is fully covered',
                icon: (
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                ),
            },
        ],
    },
    {
        id: 'get-started',
        title: 'Ready to Deliver?',
        subtitle: 'Create an account to start sending deliveries',
        illustration: (
            <div className="relative w-40 h-40 mx-auto">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-primary/5 rounded-full" />
                <svg className="w-full h-full text-primary p-6" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    {/* Delivery box/package icon */}
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
            </div>
        ),
    },
];

export default function OnboardingPage() {
    const router = useRouter();
    const [currentStep, setCurrentStep] = useState(0);

    const handleNext = () => {
        if (currentStep < ONBOARDING_STEPS.length - 1) {
            setCurrentStep(currentStep + 1);
        }
    };

    const handleSkip = () => {
        completeOnboarding();
    };

    const completeOnboarding = () => {
        localStorage.setItem('udd_onboarding_complete', 'true');
        router.push('/login');
    };

    const handleGetStarted = (hasAccount: boolean) => {
        localStorage.setItem('udd_onboarding_complete', 'true');
        if (hasAccount) {
            router.push('/login');
        } else {
            router.push('/login?signup=true');
        }
    };

    const step = ONBOARDING_STEPS[currentStep];

    return (
        <div className="min-h-screen flex flex-col" style={{ backgroundColor: 'var(--bg)' }}>
            {/* Header */}
            <div className="flex items-center justify-between p-4 md:p-6">
                <div className="flex items-center gap-2">
                    <img
                        src="/udd-logo-icon.png"
                        alt="UDD Logo"
                        className="w-16 h-16 object-contain"
                    />
                    <span className="text-sm font-semibold text-gray-600">Universal Delivery Drone</span>
                </div>
                {currentStep < ONBOARDING_STEPS.length - 1 && (
                    <button
                        onClick={handleSkip}
                        className="text-sm font-medium text-gray-400 hover:text-gray-600 transition-colors"
                    >
                        Skip
                    </button>
                )}
            </div>

            {/* Content */}
            <div className="flex-1 flex flex-col items-center justify-center px-6 py-8">
                <div className="w-full max-w-md">
                    {/* Welcome Step */}
                    {step.id === 'welcome' && (
                        <div className="text-center">
                            {step.illustration}
                            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mt-8 mb-3">
                                {step.title}
                            </h1>
                            <p className="text-lg text-gray-500">{step.subtitle}</p>
                        </div>
                    )}

                    {/* How It Works Step */}
                    {step.id === 'how-it-works' && (
                        <div className="text-center">
                            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">
                                {step.title}
                            </h1>
                            <p className="text-lg text-gray-500 mb-10">{step.subtitle}</p>
                            <div className="space-y-6">
                                {step.steps?.map((s, index) => (
                                    <div key={s.number} className="flex items-start gap-4 text-left bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                                        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 text-primary">
                                            {s.icon}
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="text-xs font-bold text-primary uppercase tracking-wider">Step {s.number}</span>
                                            </div>
                                            <h3 className="font-bold text-gray-900 text-lg">{s.title}</h3>
                                            <p className="text-gray-500">{s.description}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Safety Step */}
                    {step.id === 'safety' && (
                        <div className="text-center">
                            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-primary/10 flex items-center justify-center">
                                <svg className="w-10 h-10 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                                </svg>
                            </div>
                            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">
                                {step.title}
                            </h1>
                            <p className="text-lg text-gray-500 mb-8">{step.subtitle}</p>
                            <div className="space-y-4">
                                {step.features?.map((feature) => (
                                    <div key={feature.title} className="flex items-center gap-4 bg-white rounded-2xl p-5 shadow-sm border border-gray-100 text-left">
                                        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 text-primary">
                                            {feature.icon}
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-gray-900">{feature.title}</h3>
                                            <p className="text-sm text-gray-500">{feature.description}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Get Started Step */}
                    {step.id === 'get-started' && (
                        <div className="text-center">
                            <div className="w-32 h-32 mx-auto mb-6 rounded-full bg-primary/10 flex items-center justify-center">
                                <svg className="w-16 h-16 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    {/* Delivery box/package icon */}
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                                </svg>
                            </div>
                            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">
                                {step.title}
                            </h1>
                            <p className="text-lg text-gray-500 mb-10">{step.subtitle}</p>
                            <div className="space-y-4">
                                <button
                                    onClick={() => handleGetStarted(false)}
                                    className="btn-giant"
                                >
                                    Create Account
                                </button>
                                <button
                                    onClick={() => handleGetStarted(true)}
                                    className="btn-secondary w-full"
                                >
                                    I already have an account
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Footer */}
            <div className="p-6 space-y-4">
                {/* Pagination Dots */}
                <div className="flex justify-center gap-2">
                    {ONBOARDING_STEPS.map((_, index) => (
                        <button
                            key={index}
                            onClick={() => setCurrentStep(index)}
                            className={`h-2.5 rounded-full transition-all ${index === currentStep
                                ? 'w-8'
                                : 'w-2.5 hover:opacity-80'
                                }`}
                            style={{
                                backgroundColor: index === currentStep ? '#006B6B' : '#9CA3AF'
                            }}
                            aria-label={`Go to step ${index + 1}`}
                        />
                    ))}
                </div>

                {/* Next Button (not on last step) */}
                {currentStep < ONBOARDING_STEPS.length - 1 && (
                    <button
                        onClick={handleNext}
                        className="btn-primary w-full"
                    >
                        Next
                    </button>
                )}
            </div>
        </div>
    );
}
