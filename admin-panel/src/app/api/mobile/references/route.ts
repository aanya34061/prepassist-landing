import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
};

export async function OPTIONS() {
    return NextResponse.json({}, { headers: corsHeaders });
}

// Public endpoint - no auth required
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const category = searchParams.get('category');

        const db = getAdminDb();

        // Special handling for history timeline
        if (category === 'history_timeline') {
            const eventsSnapshot = await db
                .collection('history_timeline_events')
                .orderBy('order', 'asc')
                .get();

            const events = eventsSnapshot.docs.map(doc => {
                const e = doc.data();
                return {
                    year: e.year,
                    event: e.event,
                    category: e.category,
                    details: e.details,
                };
            });

            return NextResponse.json({
                references: events,
                type: 'timeline'
            }, { headers: corsHeaders });
        }

        if (category && category !== 'all') {
            const refsSnapshot = await db
                .collection('visual_references')
                .where('category', '==', category)
                .orderBy('order', 'asc')
                .get();

            // For a specific category, return the data directly
            // Data is stored as a single JSON blob per category
            if (!refsSnapshot.empty) {
                return NextResponse.json({
                    references: refsSnapshot.docs[0].data().data,
                    type: 'reference'
                }, { headers: corsHeaders });
            }
            return NextResponse.json({
                references: {},
                type: 'reference'
            }, { headers: corsHeaders });
        } else {
            const refsSnapshot = await db
                .collection('visual_references')
                .orderBy('category')
                .orderBy('order', 'asc')
                .get();

            // Group references by category
            const grouped = refsSnapshot.docs.reduce((acc, doc) => {
                const ref = doc.data();
                acc[ref.category] = ref.data;
                return acc;
            }, {} as Record<string, any>);

            return NextResponse.json({
                references: grouped,
                type: 'reference'
            }, { headers: corsHeaders });
        }
    } catch (error) {
        console.error('Get references error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500, headers: corsHeaders });
    }
}
