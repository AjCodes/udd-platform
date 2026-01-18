import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createServerClient } from '@udd/shared';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
    apiVersion: '2023-10-16' as Stripe.LatestApiVersion,
});

// Use shared Supabase client to ensure same connection
function getSupabaseAdmin() {
    const supabase = createServerClient();
    console.log('[PaymentVerify] Using Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
    return supabase;
}

export async function POST(request: NextRequest) {
    try {
        const { sessionId } = await request.json();

        if (!sessionId) {
            console.error('[PaymentVerify] Missing sessionId');
            return NextResponse.json({ error: 'Session ID required' }, { status: 400 });
        }

        console.log('[PaymentVerify] Processing session:', sessionId);

        // Retrieve the Checkout Session from Stripe
        let session;
        try {
            session = await stripe.checkout.sessions.retrieve(sessionId);
            console.log('[PaymentVerify] Stripe session retrieved:', session.id, 'status:', session.payment_status);
        } catch (stripeError) {
            console.error('[PaymentVerify] Stripe error:', stripeError);
            return NextResponse.json({ error: 'Failed to retrieve payment session' }, { status: 500 });
        }

        if (session.payment_status !== 'paid') {
            console.error('[PaymentVerify] Payment not paid:', session.payment_status);
            return NextResponse.json({ error: 'Payment not completed' }, { status: 400 });
        }

        const supabaseAdmin = getSupabaseAdmin();

        // Check if delivery already exists for this session (idempotency)
        const { data: existingDelivery, error: existingError } = await supabaseAdmin
            .from('deliveries')
            .select('id, pin')
            .eq('stripe_session_id', sessionId)
            .single();

        if (existingError && existingError.code !== 'PGRST116') {
            console.error('[PaymentVerify] Error checking existing delivery:', existingError);
        }

        if (existingDelivery) {
            console.log('[PaymentVerify] Delivery already exists:', existingDelivery.id);
            return NextResponse.json({ deliveryId: existingDelivery.id, pin: existingDelivery.pin });
        }

        // Extract delivery details from session metadata
        const metadata = session.metadata || {};
        const userEmail = metadata.userEmail || session.customer_details?.email;

        if (!userEmail) {
            console.error('[PaymentVerify] User email not found in metadata:', metadata);
            return NextResponse.json({ error: 'User email not found' }, { status: 400 });
        }

        console.log('[PaymentVerify] Finding user by email:', userEmail);

        // Find user by email using Supabase auth admin API
        const { data: userData, error: listError } = await supabaseAdmin.auth.admin.listUsers();

        if (listError) {
            console.error('[PaymentVerify] Error listing users:', listError);
            return NextResponse.json({ error: 'Failed to find user' }, { status: 500 });
        }

        const user = userData?.users?.find(u => u.email?.toLowerCase() === userEmail.toLowerCase());

        if (!user) {
            console.error('[PaymentVerify] User not found in auth list:', userEmail, 'Total users:', userData?.users?.length);
            return NextResponse.json({ error: 'User not found' }, { status: 400 });
        }

        const userId = user.id;
        console.log('[PaymentVerify] Found user ID:', userId);

        if (!userId) {
            console.error('[PaymentVerify] User ID is null/undefined');
            return NextResponse.json({ error: 'User not found' }, { status: 400 });
        }

        // Validate required metadata fields
        if (!metadata.pickupLat || !metadata.pickupLng || !metadata.dropoffLat || !metadata.dropoffLng) {
            console.error('[PaymentVerify] Missing required location data:', {
                hasPickup: !!(metadata.pickupLat && metadata.pickupLng),
                hasDropoff: !!(metadata.dropoffLat && metadata.dropoffLng),
            });
            return NextResponse.json({ error: 'Missing delivery location data' }, { status: 400 });
        }

        // Generate PIN
        const pin = Math.floor(100000 + Math.random() * 900000).toString();
        console.log('[PaymentVerify] Generated PIN for delivery');

        // Create the delivery
        const deliveryData = {
            user_id: userId,
            status: 'pending',
            pin,
            pickup_lat: parseFloat(metadata.pickupLat),
            pickup_lng: parseFloat(metadata.pickupLng),
            pickup_address: metadata.pickupAddress || '',
            dropoff_lat: parseFloat(metadata.dropoffLat),
            dropoff_lng: parseFloat(metadata.dropoffLng),
            dropoff_address: metadata.dropoffAddress || '',
            package_description: `[${(metadata.parcelSize || 'standard').toUpperCase()}] ${metadata.description || ''}`.trim(),
            sender_name: metadata.senderName || 'Unknown',
            sender_phone: metadata.senderPhone || '',
            receiver_name: metadata.receiverName || 'Unknown',
            receiver_phone: metadata.receiverPhone || '',
            stripe_session_id: sessionId,
        };

        console.log('[PaymentVerify] Creating delivery with data:', {
            userId,
            pickup: `${deliveryData.pickup_lat}, ${deliveryData.pickup_lng}`,
            dropoff: `${deliveryData.dropoff_lat}, ${deliveryData.dropoff_lng}`,
        });

        const { data: delivery, error: insertError } = await supabaseAdmin
            .from('deliveries')
            .insert(deliveryData)
            .select()
            .single();

        if (insertError) {
            // Handle race condition: if it failed because of duplicate key, it means the delivery
            // was likely created by a concurrent request. Try to fetch and return it.
            if (insertError.code === '23505') {
                console.log('[PaymentVerify] Duplicate key error, fetching existing delivery for session:', sessionId);
                const { data: retryData, error: retryError } = await supabaseAdmin
                    .from('deliveries')
                    .select('id, pin')
                    .eq('stripe_session_id', sessionId)
                    .single();

                if (retryError) {
                    console.error('[PaymentVerify] Error fetching existing delivery:', retryError);
                    return NextResponse.json({ error: 'Failed to create delivery' }, { status: 500 });
                }

                if (retryData) {
                    console.log('[PaymentVerify] Returning existing delivery:', retryData.id);
                    return NextResponse.json({ deliveryId: retryData.id, pin: retryData.pin });
                }
            }
            console.error('[PaymentVerify] Failed to create delivery:', insertError);
            return NextResponse.json({
                error: 'Failed to create delivery',
                details: insertError.message
            }, { status: 500 });
        }

        if (!delivery) {
            console.error('[PaymentVerify] Delivery created but no data returned');
            return NextResponse.json({ error: 'Delivery creation failed' }, { status: 500 });
        }

        console.log('[PaymentVerify] ✅ Delivery created successfully:', delivery.id);
        console.log('[PaymentVerify] Delivery details:', {
            id: delivery.id,
            user_id: delivery.user_id,
            status: delivery.status,
            created_at: delivery.created_at,
            stripe_session_id: delivery.stripe_session_id
        });

        // Verify the delivery was actually inserted by querying it back
        const { data: _verifyDelivery, error: verifyError } = await supabaseAdmin
            .from('deliveries')
            .select('*')
            .eq('id', delivery.id)
            .single();

        if (verifyError) {
            console.error('[PaymentVerify] ⚠️ Warning: Could not verify delivery insertion:', verifyError);
        } else {
            console.log('[PaymentVerify] ✅ Verified delivery exists in database');
        }

        // Also verify total count
        const { count: totalCount, error: countError } = await supabaseAdmin
            .from('deliveries')
            .select('*', { count: 'exact', head: true });

        if (countError) {
            console.error('[PaymentVerify] Error counting deliveries:', countError);
        } else {
            console.log('[PaymentVerify] 📊 Total deliveries in database after insert:', totalCount || 0);
        }

        return NextResponse.json({ deliveryId: delivery.id, pin: delivery.pin });
    } catch (error) {
        console.error('[PaymentVerify] Unexpected error:', error);
        return NextResponse.json({
            error: 'Verification failed',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
}
