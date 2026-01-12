import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@shared/supabase';

// POST /api/deliveries/[id]/cancel - Cancel a delivery
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
            .select('*')
            .eq('id', params.id)
            .eq('user_id', user.id)
            .single();

        if (fetchError || !delivery) {
            return NextResponse.json({ error: 'Delivery not found' }, { status: 404 });
        }

        // Only allow cancellation if not already in transit or delivered
        if (delivery.status === 'in_transit' || delivery.status === 'delivered') {
            return NextResponse.json(
                { error: 'Cannot cancel delivery that is in transit or already delivered' },
                { status: 400 }
            );
        }

        // Update status to cancelled
        const { data, error } = await supabase
            .from('deliveries')
            .update({ status: 'cancelled', updated_at: new Date().toISOString() })
            .eq('id', params.id)
            .select()
            .single();

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json(data);
    } catch (error) {
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
