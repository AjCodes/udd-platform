import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@udd/shared';

// PATCH /api/deliveries/[id]/status - Update delivery status
export async function PATCH(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const supabase = createServerClient();
        const body = await request.json();
        const { status } = body;

        // Validate status
        const validStatuses = ['assigned', 'in_transit', 'delivered', 'cancelled'];
        if (!validStatuses.includes(status)) {
            return NextResponse.json(
                { error: `Invalid status. Valid: ${validStatuses.join(', ')}` },
                { status: 400 }
            );
        }

        // Update delivery
        const { data, error } = await supabase
            .from('deliveries')
            .update({
                status,
                updated_at: new Date().toISOString(),
            })
            .eq('id', params.id)
            .select()
            .single();

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        // If delivered, set drone back to idle
        if (status === 'delivered' && data?.drone_id) {
            await supabase
                .from('drones')
                .update({ status: 'idle' })
                .eq('id', data.drone_id);
        }

        return NextResponse.json(data);
    } catch (error) {
        console.error('Failed to update delivery status:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
