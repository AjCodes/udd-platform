import { NextResponse } from 'next/server';
import { createServerClient } from '@udd/shared';

// GET /api/deliveries/test-rls - Test RLS bypass with service role
export async function GET() {
    try {
        const supabase = createServerClient();
        
        const results: Record<string, unknown> = {
            timestamp: new Date().toISOString(),
            supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
            serviceRoleKeyPrefix: process.env.SUPABASE_SERVICE_ROLE_KEY?.substring(0, 20) || 'NOT SET',
        };

        // Test 1: Count query
        const { count, error: countError } = await supabase
            .from('deliveries')
            .select('*', { count: 'exact', head: true });
        
        results.countTest = {
            count: count || 0,
            error: countError ? countError.message : null,
            errorCode: countError?.code || null,
        };

        // Test 2: Select with all columns
        const { data: allData, error: allError } = await supabase
            .from('deliveries')
            .select('*');
        
        results.selectAllTest = {
            count: allData?.length || 0,
            error: allError ? allError.message : null,
            errorCode: allError?.code || null,
            errorDetails: allError?.details || null,
        };

        // Test 3: Select with specific columns only
        const { data: specificData, error: specificError } = await supabase
            .from('deliveries')
            .select('id, status, created_at');
        
        results.selectSpecificTest = {
            count: specificData?.length || 0,
            error: specificError ? specificError.message : null,
            errorCode: specificError?.code || null,
        };

        // Test 4: Check auth context (service role should have null uid)
        try {
            const { data: authData } = await supabase.auth.getUser();
            results.authTest = {
                user: authData?.user ? 'has user' : 'no user (expected for service role)',
                userId: authData?.user?.id || null,
            };
        } catch (authError) {
            results.authTest = {
                error: authError instanceof Error ? authError.message : 'Unknown error',
            };
        }

        console.log('[RLSTest] Results:', JSON.stringify(results, null, 2));

        return NextResponse.json(results);
    } catch (error) {
        console.error('[RLSTest] Error:', error);
        return NextResponse.json({ 
            error: 'Test failed',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
}
