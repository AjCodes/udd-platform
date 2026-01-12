import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@shared/supabase';

// POST /api/deliveries/[id]/unlock - Unlock storage compartment
export async function POST(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const supabase = createServerClient();

        // Get authenticated user
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Check if delivery exists and belongs to user
        const { data: delivery, error: fetchError } = await supabase
            .from('deliveries')
            .select('*, drone_id')
            .eq('id', params.id)
            .eq('user_id', user.id)
            .single();

        if (fetchError || !delivery) {
            return NextResponse.json({ error: 'Delivery not found' }, { status: 404 });
        }

        // Only allow unlock if delivery is in transit (drone has arrived)
        if (delivery.status !== 'in_transit') {
            return NextResponse.json(
                { error: 'Cannot unlock - delivery is not ready for pickup' },
                { status: 400 }
            );
        }

        if (!delivery.drone_id) {
            return NextResponse.json(
                { error: 'No drone assigned to this delivery' },
                { status: 400 }
            );
        }

        // TODO: Send unlock command to drone via MQTT
        // For now, we'll just log it and mark as delivered
        console.log(`Sending unlock command to drone ${delivery.drone_id}`);

        // Update delivery status to delivered
        const { data, error } = await supabase
            .from('deliveries')
            .update({ status: 'delivered', updated_at: new Date().toISOString() })
            .eq('id', params.id)
            .select()
            .single();

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            message: 'Storage compartment unlocked',
            delivery: data
        });
    } catch (error) {
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
