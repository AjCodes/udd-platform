'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@udd/shared';

interface AddressSuggestion {
    id: string;
    displayName: string;
    lat: number;
    lng: number;
}

const PARCEL_SIZES = [
    { id: 'small', label: 'Small', description: 'Documents, small items', weight: '< 0.5 kg', icon: '📄', extraCost: 0 },
    { id: 'medium', label: 'Medium', description: 'Groceries, medication', weight: '0.5 - 2 kg', icon: '📦', extraCost: 1.50 },
    { id: 'large', label: 'Large', description: 'Packages, boxes', weight: '2 - 5 kg', icon: '🎁', extraCost: 3.50 },
];

// Preset favorite addresses (for quick selection during presentation)
const FAVORITE_ADDRESSES = [
    { id: 'fontys-r10', displayName: 'Fontys Campus R10 - Rachelsmolen 1, Eindhoven', lat: 51.4512, lng: 5.4841 },
    { id: 'fontys-tq', displayName: 'Fontys TQ Building - Strijp-T, Eindhoven', lat: 51.4492, lng: 5.4549 },
    { id: 'eindhoven-central', displayName: 'Eindhoven Centraal Station', lat: 51.4433, lng: 5.4815 },
    { id: 'eindhoven-airport', displayName: 'Eindhoven Airport', lat: 51.4580, lng: 5.3928 },
];

// Calculate distance between two coordinates (Haversine formula)
function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

// Calculate price
function calculatePrice(distanceKm: number, parcelSize: string): number {
    const baseFee = 2.99;
    const distanceFee = distanceKm * 0.50;
    const weightFee = PARCEL_SIZES.find(s => s.id === parcelSize)?.extraCost || 0;
    return baseFee + distanceFee + weightFee;
}

export default function NewDeliveryPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Form state
    const [pickupAddress, setPickupAddress] = useState('');
    const [pickupCoords, setPickupCoords] = useState<{ lat: number; lng: number } | null>(null);
    const [dropoffAddress, setDropoffAddress] = useState('');
    const [dropoffCoords, setDropoffCoords] = useState<{ lat: number; lng: number } | null>(null);
    const [parcelSize, setParcelSize] = useState('');
    const [description, setDescription] = useState('');
    const [senderName, setSenderName] = useState('');
    const [senderPhone, setSenderPhone] = useState('');
    const [receiverName, setReceiverName] = useState('');
    const [receiverPhone, setReceiverPhone] = useState('');
    const [phoneError, setPhoneError] = useState('');
    const [senderPhoneError, setSenderPhoneError] = useState('');

    // Autocomplete state
    const [pickupSuggestions, setPickupSuggestions] = useState<AddressSuggestion[]>([]);
    const [dropoffSuggestions, setDropoffSuggestions] = useState<AddressSuggestion[]>([]);
    const [showPickupDropdown, setShowPickupDropdown] = useState(false);
    const [showDropoffDropdown, setShowDropoffDropdown] = useState(false);
    const pickupTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const dropoffTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Load user data to pre-fill sender
    useEffect(() => {
        const loadUser = async () => {
            const supabase = createBrowserClient();
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                setSenderName(user.user_metadata?.full_name || user.email?.split('@')[0] || '');
            }
        };
        loadUser();
    }, []);

    // Calculate current price
    const distance = pickupCoords && dropoffCoords
        ? calculateDistance(pickupCoords.lat, pickupCoords.lng, dropoffCoords.lat, dropoffCoords.lng)
        : 0;
    const price = parcelSize ? calculatePrice(distance, parcelSize) : 0;
    const canShowPrice = pickupCoords && dropoffCoords && parcelSize;

    // Fetch address suggestions via server-side API (bypasses CORS)
    const fetchAddressSuggestions = async (query: string): Promise<AddressSuggestion[]> => {
        if (query.length < 3) return [];

        try {
            const response = await fetch(`/api/address/search?q=${encodeURIComponent(query)}`);
            const data = await response.json();
            return data.suggestions || [];
        } catch (err) {
            console.error('Failed to fetch address suggestions:', err);
            return [];
        }
    };

    const handlePickupChange = (value: string) => {
        setPickupAddress(value);
        setPickupCoords(null);

        if (pickupTimeoutRef.current) clearTimeout(pickupTimeoutRef.current);

        if (value.length >= 3) {
            pickupTimeoutRef.current = setTimeout(async () => {
                const suggestions = await fetchAddressSuggestions(value);
                // Combine favorites that match with API results
                const matchingFavorites = FAVORITE_ADDRESSES.filter(f =>
                    f.displayName.toLowerCase().includes(value.toLowerCase())
                );
                const combined = [...matchingFavorites, ...suggestions];
                setPickupSuggestions(combined);
                setShowPickupDropdown(combined.length > 0);
            }, 300);
        } else if (value.length === 0) {
            // Show favorites when empty
            setPickupSuggestions(FAVORITE_ADDRESSES);
            setShowPickupDropdown(true);
        } else {
            setPickupSuggestions([]);
            setShowPickupDropdown(false);
        }
    };

    const handleDropoffChange = (value: string) => {
        setDropoffAddress(value);
        setDropoffCoords(null);

        if (dropoffTimeoutRef.current) clearTimeout(dropoffTimeoutRef.current);

        if (value.length >= 3) {
            dropoffTimeoutRef.current = setTimeout(async () => {
                const suggestions = await fetchAddressSuggestions(value);
                // Combine favorites that match with API results
                const matchingFavorites = FAVORITE_ADDRESSES.filter(f =>
                    f.displayName.toLowerCase().includes(value.toLowerCase())
                );
                const combined = [...matchingFavorites, ...suggestions];
                setDropoffSuggestions(combined);
                setShowDropoffDropdown(combined.length > 0);
            }, 300);
        } else if (value.length === 0) {
            // Show favorites when empty
            setDropoffSuggestions(FAVORITE_ADDRESSES);
            setShowDropoffDropdown(true);
        } else {
            setDropoffSuggestions([]);
            setShowDropoffDropdown(false);
        }
    };

    const selectPickupSuggestion = (suggestion: AddressSuggestion) => {
        setPickupAddress(suggestion.displayName);
        setPickupCoords({ lat: suggestion.lat, lng: suggestion.lng });
        setPickupSuggestions([]);
        setShowPickupDropdown(false);
    };

    const selectDropoffSuggestion = (suggestion: AddressSuggestion) => {
        setDropoffAddress(suggestion.displayName);
        setDropoffCoords({ lat: suggestion.lat, lng: suggestion.lng });
        setDropoffSuggestions([]);
        setShowDropoffDropdown(false);
    };

    const validateDutchPhone = (phone: string) => {
        if (!phone) return false;
        // Dutch phone format: 10 digits starting with 0. 
        // Mobile starts with 06, landline starts with 0 + area code.
        const cleaned = phone.replace(/\s/g, '');
        const regex = /^(?:06[1-9][0-9]{7}|0[1-9][0-9]{8})$/;
        return regex.test(cleaned);
    };

    // Derived validation state
    const isSenderPhoneValid = validateDutchPhone(senderPhone);
    const isReceiverPhoneValid = validateDutchPhone(receiverPhone);
    const isFormValid = pickupCoords !== null &&
        dropoffCoords !== null &&
        parcelSize !== '' &&
        senderName.trim() !== '' &&
        isSenderPhoneValid &&
        receiverName.trim() !== '' &&
        isReceiverPhoneValid;

    // Use effects for real-time error feedback
    useEffect(() => {
        const cleaned = senderPhone.replace(/\s/g, '');
        if (cleaned && !isSenderPhoneValid && cleaned.length >= 10) {
            setSenderPhoneError('Invalid Dutch phone number (must be 10 digits)');
        } else if (isSenderPhoneValid) {
            setSenderPhoneError('');
        }
    }, [senderPhone, isSenderPhoneValid]);

    useEffect(() => {
        const cleaned = receiverPhone.replace(/\s/g, '');
        if (cleaned && !isReceiverPhoneValid && cleaned.length >= 10) {
            setPhoneError('Invalid Dutch phone number (must be 10 digits)');
        } else if (isReceiverPhoneValid) {
            setPhoneError('');
        }
    }, [receiverPhone, isReceiverPhoneValid]);

    const handlePayment = async () => {
        if (!isFormValid) {
            if (!pickupCoords || !dropoffCoords) setError('Please select valid addresses');
            else if (!parcelSize) setError('Please select a parcel size');
            else if (!senderName.trim() || !receiverName.trim()) setError('Name fields are required');
            else if (!isSenderPhoneValid || !isReceiverPhoneValid) setError('Please enter valid 10-digit Dutch phone numbers');
            return;
        }

        setLoading(true);

        try {
            // Get user email for Stripe
            const supabase = (await import('@udd/shared')).createBrowserClient();
            const { data: { user } } = await supabase.auth.getUser();
            const userEmail = user?.email || '';

            // Create Stripe checkout session
            const response = await fetch('/api/payment/create-session', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    pickupLat: pickupCoords.lat,
                    pickupLng: pickupCoords.lng,
                    pickupAddress,
                    dropoffLat: dropoffCoords.lat,
                    dropoffLng: dropoffCoords.lng,
                    dropoffAddress,
                    parcelSize,
                    description,
                    userEmail,
                    senderName,
                    senderPhone,
                    receiverName,
                    receiverPhone,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to create payment session');
            }

            // Redirect to Stripe Checkout
            window.location.href = data.sessionUrl;
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Payment failed');
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen" style={{ backgroundColor: 'var(--bg)' }}>
            {/* Header */}
            <div className="bg-white border-b px-5 py-5 flex items-center">
                <button
                    onClick={() => router.push('/dashboard')}
                    className="mr-4 p-2 -ml-2 rounded-xl hover:bg-gray-100 transition-colors"
                    style={{ minHeight: '48px', minWidth: '48px' }}
                    aria-label="Go back"
                >
                    <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                </button>
                <h1 className="text-xl font-semibold">Request Delivery</h1>
            </div>

            {/* Form */}
            <div className="p-5 space-y-6">
                {/* Pickup Address */}
                <div className="relative">
                    <label className="block text-base font-medium text-gray-700 mb-2">
                        <span className="flex items-center gap-2">
                            <span className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white" style={{ backgroundColor: 'var(--success)' }}>A</span>
                            Pickup Address
                        </span>
                    </label>
                    <input
                        type="text"
                        className="input"
                        placeholder="Start typing (e.g., Fontys Eindhoven)"
                        value={pickupAddress}
                        onChange={(e) => handlePickupChange(e.target.value)}
                        onFocus={() => {
                            if (pickupAddress.length === 0) {
                                setPickupSuggestions(FAVORITE_ADDRESSES);
                                setShowPickupDropdown(true);
                            } else if (pickupSuggestions.length > 0) {
                                setShowPickupDropdown(true);
                            }
                        }}
                        onBlur={() => setTimeout(() => setShowPickupDropdown(false), 200)}
                    />
                    {pickupCoords && (
                        <span className="absolute right-3 top-12 text-xl">✓</span>
                    )}

                    {showPickupDropdown && pickupSuggestions.length > 0 && (
                        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-60 overflow-y-auto">
                            {pickupSuggestions.map((suggestion) => (
                                <button
                                    key={suggestion.id}
                                    type="button"
                                    className="w-full text-left px-4 py-3 hover:bg-gray-50 border-b border-gray-100 last:border-b-0 flex items-center gap-3"
                                    onClick={() => selectPickupSuggestion(suggestion)}
                                >
                                    <span className="text-gray-400">📍</span>
                                    <span className="text-gray-900">{suggestion.displayName}</span>
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Dropoff Address */}
                <div className="relative">
                    <label className="block text-base font-medium text-gray-700 mb-2">
                        <span className="flex items-center gap-2">
                            <span className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white" style={{ backgroundColor: 'var(--warning)' }}>B</span>
                            Dropoff Address
                        </span>
                    </label>
                    <input
                        type="text"
                        className="input"
                        placeholder="Start typing (e.g., Fontys Eindhoven)"
                        value={dropoffAddress}
                        onChange={(e) => handleDropoffChange(e.target.value)}
                        onFocus={() => {
                            if (dropoffAddress.length === 0) {
                                setDropoffSuggestions(FAVORITE_ADDRESSES);
                                setShowDropoffDropdown(true);
                            } else if (dropoffSuggestions.length > 0) {
                                setShowDropoffDropdown(true);
                            }
                        }}
                        onBlur={() => setTimeout(() => setShowDropoffDropdown(false), 200)}
                    />
                    {dropoffCoords && (
                        <span className="absolute right-3 top-12 text-xl">✓</span>
                    )}

                    {showDropoffDropdown && dropoffSuggestions.length > 0 && (
                        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-60 overflow-y-auto">
                            {dropoffSuggestions.map((suggestion) => (
                                <button
                                    key={suggestion.id}
                                    type="button"
                                    className="w-full text-left px-4 py-3 hover:bg-gray-50 border-b border-gray-100 last:border-b-0 flex items-center gap-3"
                                    onClick={() => selectDropoffSuggestion(suggestion)}
                                >
                                    <span className="text-gray-400">📍</span>
                                    <span className="text-gray-900">{suggestion.displayName}</span>
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Parcel Size Selection */}
                <div>
                    <label className="block text-base font-medium text-gray-700 mb-3">
                        Parcel Size
                    </label>
                    {/* Contact Information */}
                    <div className="space-y-6 mb-6">
                        {/* Sender Section */}
                        <div className="card">
                            <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                <span className="w-6 h-6 rounded-full bg-teal-100 text-teal-600 flex items-center justify-center text-xs">1</span>
                                Sender Information (You)
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-medium text-gray-500 mb-1">
                                        Your Name
                                    </label>
                                    <input
                                        type="text"
                                        value={senderName}
                                        onChange={(e) => setSenderName(e.target.value)}
                                        placeholder="Sender name"
                                        className="w-full px-4 py-3 rounded-xl border focus:ring-2 outline-none transition-all"
                                        style={{ borderColor: 'var(--border)' }}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-500 mb-1">
                                        Your Phone Number
                                    </label>
                                    <input
                                        type="tel"
                                        value={senderPhone}
                                        onChange={(e) => {
                                            setSenderPhone(e.target.value);
                                            if (senderPhoneError) setSenderPhoneError('');
                                        }}
                                        placeholder="e.g. 0612345678"
                                        className={`w-full px-4 py-3 rounded-xl border focus:ring-2 outline-none transition-all ${senderPhoneError ? 'border-red-500 bg-red-50' : ''
                                            }`}
                                        style={{ borderColor: senderPhoneError ? '#ef4444' : 'var(--border)' }}
                                    />
                                    {senderPhoneError && (
                                        <p className="text-red-500 text-xs mt-1">{senderPhoneError}</p>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Receiver Section */}
                        <div className="card">
                            <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                <span className="w-6 h-6 rounded-full bg-teal-100 text-teal-600 flex items-center justify-center text-xs">2</span>
                                Receiver Information
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-medium text-gray-500 mb-1">
                                        Receiver&apos;s Name
                                    </label>
                                    <input
                                        type="text"
                                        value={receiverName}
                                        onChange={(e) => setReceiverName(e.target.value)}
                                        placeholder="Receiver name"
                                        className="w-full px-4 py-3 rounded-xl border focus:ring-2 outline-none transition-all"
                                        style={{ borderColor: 'var(--border)' }}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-500 mb-1">
                                        Receiver&apos;s Phone Number
                                    </label>
                                    <input
                                        type="tel"
                                        value={receiverPhone}
                                        onChange={(e) => {
                                            setReceiverPhone(e.target.value);
                                            if (phoneError) setPhoneError('');
                                        }}
                                        placeholder="e.g. 0612345678"
                                        className={`w-full px-4 py-3 rounded-xl border focus:ring-2 outline-none transition-all ${phoneError ? 'border-red-500 bg-red-50' : ''
                                            }`}
                                        style={{ borderColor: phoneError ? '#ef4444' : 'var(--border)' }}
                                    />
                                    {phoneError && (
                                        <p className="text-red-500 text-xs mt-1">{phoneError}</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Parcel sizing */}
                    <div className="mb-6 grid grid-cols-3 gap-3">
                        {PARCEL_SIZES.map((size) => (
                            <button
                                key={size.id}
                                type="button"
                                onClick={() => setParcelSize(size.id)}
                                className={`p-4 rounded-xl border-2 transition-all text-center ${parcelSize === size.id
                                    ? 'border-teal-600 bg-teal-50'
                                    : 'border-gray-200 bg-white hover:border-gray-300'
                                    }`}
                            >
                                <div className="text-2xl mb-1">{size.icon}</div>
                                <div className="font-semibold text-sm">{size.label}</div>
                                <div className="text-xs text-gray-500">{size.weight}</div>
                                {size.extraCost > 0 && (
                                    <div className="text-xs text-teal-600 mt-1">+€{size.extraCost.toFixed(2)}</div>
                                )}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Package Description */}
                <div>
                    <label className="block text-base font-medium text-gray-700 mb-2">
                        Package Description (optional)
                    </label>
                    <textarea
                        className="input min-h-[80px]"
                        placeholder="What are you sending?"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                    />
                </div>

                {/* Price Summary */}
                {canShowPrice && (
                    <div className="card" style={{ backgroundColor: 'var(--primary-light)', borderColor: 'var(--primary)' }}>
                        <h3 className="font-semibold mb-3" style={{ color: 'var(--primary-dark)' }}>Price Summary</h3>
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                                <span className="text-gray-600">Base fee</span>
                                <span>€2.99</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600">Distance ({distance.toFixed(1)} km × €0.50)</span>
                                <span>€{(distance * 0.50).toFixed(2)}</span>
                            </div>
                            {(PARCEL_SIZES.find(s => s.id === parcelSize)?.extraCost ?? 0) > 0 && (
                                <div className="flex justify-between">
                                    <span className="text-gray-600">{parcelSize.charAt(0).toUpperCase() + parcelSize.slice(1)} parcel fee</span>
                                    <span>€{PARCEL_SIZES.find(s => s.id === parcelSize)?.extraCost?.toFixed(2)}</span>
                                </div>
                            )}
                            <div className="border-t pt-2 mt-2 flex justify-between font-bold text-lg" style={{ borderColor: 'var(--primary)', color: 'var(--primary-dark)' }}>
                                <span>Total</span>
                                <span>€{price.toFixed(2)}</span>
                            </div>
                        </div>
                    </div>
                )}

                {/* Error display */}
                {error && (
                    <div className="text-white text-base p-4 rounded-xl" style={{ backgroundColor: 'var(--warning)' }}>
                        {error}
                    </div>
                )}

                {/* Payment button */}
                <button
                    onClick={handlePayment}
                    disabled={loading || !isFormValid}
                    className="btn-giant disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {loading ? (
                        <span className="flex items-center gap-3">
                            <svg className="animate-spin h-6 w-6" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Redirecting to Payment...
                        </span>
                    ) : isFormValid ? (
                        <span className="flex items-center gap-3">
                            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                            </svg>
                            Pay €{price.toFixed(2)} & Request Delivery
                        </span>
                    ) : (
                        <span className="flex items-center gap-3">
                            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                            Complete all fields (+ valid phone)
                        </span>
                    )}
                </button>

                {/* Payment methods info */}
                <div className="text-center text-sm text-gray-500">
                    <p>Secure payment via Stripe</p>
                    <div className="flex items-center justify-center gap-3 mt-2">
                        <span className="px-2 py-1 bg-gray-100 rounded text-xs">💳 Card</span>
                        <span className="px-2 py-1 bg-orange-50 rounded text-xs border border-orange-200">🏦 iDEAL</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
