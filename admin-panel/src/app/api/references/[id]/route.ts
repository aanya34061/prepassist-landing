import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';
import { verifyAuth } from '@/lib/auth';

export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    const user = await verifyAuth(request);
    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { searchParams } = new URL(request.url);
        const type = searchParams.get('type');
        const { id } = params;
        const db = getAdminDb();

        if (type === 'timeline') {
            const eventDoc = await db.collection('history_timeline_events').doc(id).get();
            if (!eventDoc.exists) {
                return NextResponse.json({ error: 'Event not found' }, { status: 404 });
            }
            return NextResponse.json({ reference: { id: eventDoc.id, ...eventDoc.data() }, type: 'timeline' });
        }

        const refDoc = await db.collection('visual_references').doc(id).get();
        if (!refDoc.exists) {
            return NextResponse.json({ error: 'Reference not found' }, { status: 404 });
        }

        return NextResponse.json({ reference: { id: refDoc.id, ...refDoc.data() }, type: 'reference' });
    } catch (error) {
        console.error('Get reference error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function PUT(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    const user = await verifyAuth(request);
    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { id } = params;
        const body = await request.json();
        const { type } = body;
        const db = getAdminDb();
        const now = new Date().toISOString();

        if (type === 'timeline') {
            const { year, event, category, details, order } = body;
            const eventRef = db.collection('history_timeline_events').doc(id);
            const eventDoc = await eventRef.get();

            if (!eventDoc.exists) {
                return NextResponse.json({ error: 'Event not found' }, { status: 404 });
            }

            await eventRef.update({ year, event, category, details, order, updatedAt: now });
            const updatedDoc = await eventRef.get();

            await db.collection('activity_logs').add({
                action: 'timeline_event_updated',
                entityType: 'reference',
                entityId: id,
                description: `Timeline event "${event}" was updated`,
                createdAt: now,
            });

            return NextResponse.json({ reference: { id: updatedDoc.id, ...updatedDoc.data() } });
        }

        const { category, subcategory, title, data, order } = body;
        const refRef = db.collection('visual_references').doc(id);
        const refDoc = await refRef.get();

        if (!refDoc.exists) {
            return NextResponse.json({ error: 'Reference not found' }, { status: 404 });
        }

        await refRef.update({ category, subcategory, title, data, order, updatedAt: now });
        const updatedDoc = await refRef.get();

        await db.collection('activity_logs').add({
            action: 'reference_updated',
            entityType: 'reference',
            entityId: id,
            description: `Reference "${title}" was updated`,
            createdAt: now,
        });

        return NextResponse.json({ reference: { id: updatedDoc.id, ...updatedDoc.data() } });
    } catch (error) {
        console.error('Update reference error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    const user = await verifyAuth(request);
    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { searchParams } = new URL(request.url);
        const type = searchParams.get('type');
        const { id } = params;
        const db = getAdminDb();
        const now = new Date().toISOString();

        if (type === 'timeline') {
            const eventRef = db.collection('history_timeline_events').doc(id);
            const eventDoc = await eventRef.get();
            if (!eventDoc.exists) {
                return NextResponse.json({ error: 'Event not found' }, { status: 404 });
            }
            const eventData = eventDoc.data()!;
            await eventRef.delete();

            await db.collection('activity_logs').add({
                action: 'timeline_event_deleted',
                entityType: 'reference',
                entityId: id,
                description: `Timeline event "${eventData.event}" was deleted`,
                createdAt: now,
            });

            return NextResponse.json({ message: 'Event deleted successfully' });
        }

        const refRef = db.collection('visual_references').doc(id);
        const refDoc = await refRef.get();
        if (!refDoc.exists) {
            return NextResponse.json({ error: 'Reference not found' }, { status: 404 });
        }
        const refData = refDoc.data()!;
        await refRef.delete();

        await db.collection('activity_logs').add({
            action: 'reference_deleted',
            entityType: 'reference',
            entityId: id,
            description: `Reference "${refData.title}" was deleted`,
            createdAt: now,
        });

        return NextResponse.json({ message: 'Reference deleted successfully' });
    } catch (error) {
        console.error('Delete reference error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
