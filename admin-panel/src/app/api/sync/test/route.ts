import { NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';

export async function GET() {
    const sb = getSupabase();
    if (!sb) {
        return NextResponse.json({
            ok: false,
            error: 'Supabase client is null',
            env: {
                url: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
                key: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
            },
        });
    }

    // Test 1: Can we query question_sets?
    const { data: sets, error: setsErr } = await sb.from('question_sets').select('id, title, firestore_id').limit(5);

    // Test 2: Try inserting and deleting a test row
    const testId = `test_${Date.now()}`;
    const { error: insertErr } = await sb.from('question_sets').insert({
        firestore_id: testId,
        title: 'SYNC TEST - auto delete',
        is_published: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
    });

    let deleteErr = null;
    if (!insertErr) {
        const res = await sb.from('question_sets').delete().eq('firestore_id', testId);
        deleteErr = res.error;
    }

    return NextResponse.json({
        ok: !setsErr && !insertErr && !deleteErr,
        query: { data: sets, error: setsErr?.message },
        insert: { error: insertErr?.message || null },
        delete: { error: deleteErr?.message || null },
    });
}
