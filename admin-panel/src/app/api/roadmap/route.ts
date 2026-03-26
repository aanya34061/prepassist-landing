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
        const paper = searchParams.get('paper');
        const db = getAdminDb();

        let topicsQuery: FirebaseFirestore.Query = db.collection('roadmap_topics');

        if (paper && paper !== 'all') {
            topicsQuery = topicsQuery.where('paper', '==', paper);
        }

        topicsQuery = topicsQuery.orderBy('name', 'asc');

        const topicsSnapshot = await topicsQuery.get();

        // Fetch subtopics and sources for each topic
        const topicsWithRelations = await Promise.all(
            topicsSnapshot.docs.map(async (topicDoc) => {
                const topicData = { id: topicDoc.id, ...topicDoc.data() };

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

                return { ...topicData, subtopics, sources };
            })
        );

        return NextResponse.json({ topics: topicsWithRelations });
    } catch (error) {
        console.error('Get roadmap error:', error);
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
        const { topicId, name, paper, icon, estimatedHours, difficulty, priority, isRecurring, optional, subtopics, sources } = body;

        if (!topicId || !name || !paper || estimatedHours === undefined || estimatedHours === null || !difficulty || !priority) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const db = getAdminDb();
        const now = new Date().toISOString();

        // Check if a topic with this topicId already exists
        const existingSnapshot = await db
            .collection('roadmap_topics')
            .where('topicId', '==', topicId)
            .get();

        if (!existingSnapshot.empty) {
            return NextResponse.json({ error: 'A topic with this ID already exists' }, { status: 400 });
        }

        // Create topic
        const topicData = {
            topicId,
            name,
            paper,
            icon: icon || null,
            estimatedHours,
            difficulty,
            priority,
            isRecurring: isRecurring || false,
            optional: optional || null,
            createdAt: now,
            updatedAt: now,
        };

        const topicRef = await db.collection('roadmap_topics').add(topicData);

        // Create subtopics if provided
        if (subtopics && subtopics.length > 0) {
            const batch = db.batch();
            subtopics.forEach((st: any, index: number) => {
                const subtopicRef = topicRef.collection('subtopics').doc();
                batch.set(subtopicRef, {
                    subtopicId: st.id || `${topicId}_sub_${index}`,
                    topicId: topicRef.id,
                    name: st.name,
                    estimatedHours: st.estimatedHours,
                    order: index,
                });
            });
            await batch.commit();
        }

        // Create sources if provided
        if (sources && sources.length > 0) {
            const batch = db.batch();
            sources.forEach((src: any, index: number) => {
                const sourceRef = topicRef.collection('sources').doc();
                batch.set(sourceRef, {
                    topicId: topicRef.id,
                    type: src.type,
                    name: src.name,
                    link: src.link || null,
                    order: index,
                });
            });
            await batch.commit();
        }

        return NextResponse.json({ topic: { id: topicRef.id, ...topicData } }, { status: 201 });
    } catch (error: any) {
        console.error('Create roadmap topic error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
