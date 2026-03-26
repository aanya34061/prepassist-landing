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
        const { id } = params;
        const db = getAdminDb();

        const topicDoc = await db.collection('roadmap_topics').doc(id).get();
        if (!topicDoc.exists) {
            return NextResponse.json({ error: 'Topic not found' }, { status: 404 });
        }

        const subtopicsSnapshot = await topicDoc.ref
            .collection('subtopics')
            .orderBy('order', 'asc')
            .get();

        const subtopics = subtopicsSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
        }));

        const sourcesSnapshot = await topicDoc.ref
            .collection('sources')
            .orderBy('order', 'asc')
            .get();

        const sources = sourcesSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
        }));

        return NextResponse.json({
            topic: { id: topicDoc.id, ...topicDoc.data(), subtopics, sources },
        });
    } catch (error) {
        console.error('Get topic error:', error);
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
        const { name, paper, icon, estimatedHours, difficulty, priority, isRecurring, optional, subtopics, sources } = body;
        const db = getAdminDb();
        const now = new Date().toISOString();

        const topicRef = db.collection('roadmap_topics').doc(id);
        const topicDoc = await topicRef.get();

        if (!topicDoc.exists) {
            return NextResponse.json({ error: 'Topic not found' }, { status: 404 });
        }

        await topicRef.update({
            name,
            paper,
            icon,
            estimatedHours,
            difficulty,
            priority,
            isRecurring,
            optional,
            updatedAt: now,
        });

        // Update subtopics - delete existing and recreate
        if (subtopics !== undefined) {
            const existingSubtopics = await topicRef.collection('subtopics').get();
            const batch = db.batch();
            existingSubtopics.docs.forEach(doc => batch.delete(doc.ref));
            await batch.commit();

            if (subtopics.length > 0) {
                const insertBatch = db.batch();
                subtopics.forEach((st: any, index: number) => {
                    const subtopicRef = topicRef.collection('subtopics').doc();
                    insertBatch.set(subtopicRef, {
                        subtopicId: st.subtopicId || st.id || `${topicDoc.data()?.topicId}_sub_${index}`,
                        topicId: id,
                        name: st.name,
                        estimatedHours: st.estimatedHours,
                        order: index,
                    });
                });
                await insertBatch.commit();
            }
        }

        // Update sources - delete existing and recreate
        if (sources !== undefined) {
            const existingSources = await topicRef.collection('sources').get();
            const batch = db.batch();
            existingSources.docs.forEach(doc => batch.delete(doc.ref));
            await batch.commit();

            if (sources.length > 0) {
                const insertBatch = db.batch();
                sources.forEach((src: any, index: number) => {
                    const sourceRef = topicRef.collection('sources').doc();
                    insertBatch.set(sourceRef, {
                        topicId: id,
                        type: src.type,
                        name: src.name,
                        link: src.link || null,
                        order: index,
                    });
                });
                await insertBatch.commit();
            }
        }

        const updatedDoc = await topicRef.get();

        await db.collection('activity_logs').add({
            action: 'roadmap_topic_updated',
            entityType: 'roadmap',
            entityId: id,
            description: `Topic "${name}" was updated`,
            createdAt: now,
        });

        return NextResponse.json({ topic: { id: updatedDoc.id, ...updatedDoc.data() } });
    } catch (error) {
        console.error('Update topic error:', error);
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
        const { id } = params;
        const db = getAdminDb();

        const topicRef = db.collection('roadmap_topics').doc(id);
        const topicDoc = await topicRef.get();

        if (!topicDoc.exists) {
            return NextResponse.json({ error: 'Topic not found' }, { status: 404 });
        }

        const topicData = topicDoc.data()!;

        // Delete subcollections first
        const subtopics = await topicRef.collection('subtopics').get();
        const sources = await topicRef.collection('sources').get();
        const batch = db.batch();
        subtopics.docs.forEach(doc => batch.delete(doc.ref));
        sources.docs.forEach(doc => batch.delete(doc.ref));
        batch.delete(topicRef);
        await batch.commit();

        await db.collection('activity_logs').add({
            action: 'roadmap_topic_deleted',
            entityType: 'roadmap',
            entityId: id,
            description: `Topic "${topicData.name}" was deleted`,
            createdAt: new Date().toISOString(),
        });

        return NextResponse.json({ message: 'Topic deleted successfully' });
    } catch (error) {
        console.error('Delete topic error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
