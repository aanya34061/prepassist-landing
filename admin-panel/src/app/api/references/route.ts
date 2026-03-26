import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';
import { verifyAuth } from '@/lib/auth';

export async function GET(request: NextRequest) {
    const user = await verifyAuth(request);
    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { searchParams } = new URL(request.url);
        const category = searchParams.get('category');
        const includeId = searchParams.get('includeId');
        const db = getAdminDb();

        // Special handling for history timeline
        if (category === 'history_timeline') {
            const eventsSnapshot = await db
                .collection('history_timeline_events')
                .orderBy('order', 'asc')
                .get();

            const events = eventsSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
            }));

            return NextResponse.json({ references: events, type: 'timeline' });
        }

        if (category && category !== 'all') {
            const refsSnapshot = await db
                .collection('visual_references')
                .where('category', '==', category)
                .orderBy('order', 'asc')
                .get();

            if (!refsSnapshot.empty) {
                const refDoc = refsSnapshot.docs[0];
                const ref = { id: refDoc.id, ...refDoc.data() } as any;
                if (includeId) {
                    return NextResponse.json({ references: ref.data, id: ref.id, type: 'reference' });
                }
                return NextResponse.json({ references: ref.data, type: 'reference' });
            }
            return NextResponse.json({ references: {}, type: 'reference' });
        } else {
            const refsSnapshot = await db
                .collection('visual_references')
                .orderBy('category', 'asc')
                .get();

            const references = refsSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
            }));

            return NextResponse.json({ references, type: 'reference' });
        }
    } catch (error) {
        console.error('Get references error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    const user = await verifyAuth(request);
    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await request.json();
        const { category, subcategory, title, data, order, type } = body;
        const db = getAdminDb();
        const now = new Date().toISOString();

        // Special handling for history timeline
        if (category === 'history_timeline' || type === 'timeline') {
            const { year, event, details } = body;
            if (!year || !event) {
                return NextResponse.json({ error: 'Year and event are required for timeline' }, { status: 400 });
            }

            const eventData = {
                year,
                event,
                category: body.category === 'history_timeline' ? (subcategory || 'indian_ancient') : category,
                details: details || null,
                order: order || 0,
                createdAt: now,
                updatedAt: now,
            };

            const docRef = await db.collection('history_timeline_events').add(eventData);

            return NextResponse.json({ reference: { id: docRef.id, ...eventData } }, { status: 201 });
        }

        if (!category || !title || !data) {
            return NextResponse.json({ error: 'Category, title, and data are required' }, { status: 400 });
        }

        // Check if reference for this category already exists (upsert logic)
        const existingSnapshot = await db
            .collection('visual_references')
            .where('category', '==', category)
            .get();

        if (!existingSnapshot.empty) {
            // Update existing reference
            const existingDoc = existingSnapshot.docs[0];
            await existingDoc.ref.update({
                title,
                data,
                subcategory: subcategory || null,
                order: order || 0,
                updatedAt: now,
            });

            const updatedDoc = await existingDoc.ref.get();
            const updated = { id: updatedDoc.id, ...updatedDoc.data() };

            return NextResponse.json({ reference: updated });
        }

        // Create new reference
        const newRefData = {
            category,
            subcategory: subcategory || null,
            title,
            data,
            order: order || 0,
            createdAt: now,
            updatedAt: now,
        };

        const docRef = await db.collection('visual_references').add(newRefData);

        return NextResponse.json({ reference: { id: docRef.id, ...newRefData } }, { status: 201 });
    } catch (error) {
        console.error('Create reference error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
