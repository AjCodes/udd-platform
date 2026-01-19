import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

// Initialize Stripe with secret key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
    apiVersion: '2023-10-16' as Stripe.LatestApiVersion,
});

// Price calculation: base fee + distance fee + weight fee
function calculatePrice(distanceKm: number, parcelSize: string): number {
    const baseFee = 99; // €0.99 base fee in cents

    // Distance fee: €0.10 per km
    const distanceFee = Math.round(distanceKm * 10);

    // Weight fee based on parcel size
    const weightFees: Record<string, number> = {
        small: 0,      // Free for small parcels
        medium: 150,   // €1.50 extra
        large: 350,    // €3.50 extra
    };
    const weightFee = weightFees[parcelSize] || 0;

    return baseFee + distanceFee + weightFee;
}

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

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const {
            pickupLat, pickupLng, pickupAddress,
            dropoffLat, dropoffLng, dropoffAddress,
            parcelSize, description, userEmail,
            senderName, senderPhone,
            receiverName, receiverPhone
        } = body;

        // Calculate distance and price
        const distanceKm = calculateDistance(pickupLat, pickupLng, dropoffLat, dropoffLng);

        // Enforce 20km mission radius
        if (distanceKm > 20) {
            return NextResponse.json(
                { error: `Mission distance (${distanceKm.toFixed(1)}km) exceeds maximum drone radius (20km).` },
                { status: 400 }
            );
        }

        const priceInCents = calculatePrice(distanceKm, parcelSize);

        // Create Stripe Checkout Session
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card', 'ideal'], // Credit card + iDEAL
            mode: 'payment',
            customer_email: userEmail || undefined, // Pre-fill email if provided
            line_items: [
                {
                    price_data: {
                        currency: 'eur',
                        product_data: {
                            name: 'Drone Delivery',
                            description: `${parcelSize.charAt(0).toUpperCase() + parcelSize.slice(1)} parcel: ${pickupAddress} → ${dropoffAddress}`,
                        },
                        unit_amount: priceInCents,
                    },
                    quantity: 1,
                },
            ],
            metadata: {
                pickupLat: pickupLat.toString(),
                pickupLng: pickupLng.toString(),
                pickupAddress,
                dropoffLat: dropoffLat.toString(),
                dropoffLng: dropoffLng.toString(),
                dropoffAddress,
                parcelSize,
                description: description || '',
                distanceKm: distanceKm.toFixed(2),
                userEmail: userEmail || '',
                senderName: senderName || '',
                senderPhone: senderPhone || '',
                receiverName: receiverName || '',
                receiverPhone: receiverPhone || '',
            },
            success_url: `${request.headers.get('origin')}/delivery/payment-success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${request.headers.get('origin')}/new-delivery?cancelled=true`,
        });

        return NextResponse.json({
            sessionId: session.id,
            sessionUrl: session.url,
            priceInCents,
            distanceKm: parseFloat(distanceKm.toFixed(2)),
        });
    } catch (error) {
        console.error('Stripe session creation error:', error);
        return NextResponse.json(
            { error: 'Failed to create payment session' },
            { status: 500 }
        );
    }
}
