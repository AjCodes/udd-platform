import { NextResponse } from 'next/server';
import { createServerClient } from '@udd/shared';

// GET /api/deliveries/debug - Diagnostic endpoint to check database connection
export async function GET() {
    try {
        const supabase = createServerClient();
        
        const debug: Record<string, unknown> = {
            supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || 'NOT SET',
            serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ? 'SET' : 'NOT SET',
            timestamp: new Date().toISOString(),
        };

        // Test connection
        const { count: totalCount, error: countError } = await supabase
            .from('deliveries')
            .select('*', { count: 'exact', head: true });
        
        debug.countQuery = {
            count: totalCount || 0,
            error: countError ? countError.message : null,
        };

        // Fetch all deliveries - try multiple approaches
        let selectData: any[] = [];
        let selectError: any = null;

        // Try 1: Normal query
        const query1 = await supabase
            .from('deliveries')
            .select('id, status, created_at, user_id')
            .order('created_at', { ascending: false })
            .limit(10);
        
        if (query1.error) {
            selectError = query1.error;
            console.error('[DebugAPI] Query 1 failed:', query1.error);
            
            // Try 2: Simple query without order/limit
            const query2 = await supabase
                .from('deliveries')
                .select('id, status, created_at, user_id');
            
            if (query2.error) {
                console.error('[DebugAPI] Query 2 also failed:', query2.error);
                selectError = query2.error;
            } else {
                selectData = query2.data || [];
                selectError = null;
            }
        } else {
            selectData = query1.data || [];
        }

        debug.selectQuery = {
            count: selectData.length,
            error: selectError ? {
                message: selectError.message,
                code: selectError.code,
                details: selectError.details
            } : null,
            deliveries: selectData,
        };

        // Check drones too
        const { count: droneCount, error: droneError } = await supabase
            .from('drones')
            .select('*', { count: 'exact', head: true });
        
        debug.drones = {
            count: droneCount || 0,
            error: droneError ? droneError.message : null,
        };

        console.log('[DebugAPI] Database diagnostic:', JSON.stringify(debug, null, 2));

        return NextResponse.json(debug);
    } catch (error) {
        console.error('[DebugAPI] Error:', error);
        return NextResponse.json({ 
            error: 'Debug failed',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
}
