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
        const paper = searchParams.get('paper');

        const db = getAdminDb();

        // Get topics
        let topicsQuery: FirebaseFirestore.Query = db.collection('roadmap_topics');

        if (paper && paper !== 'all') {
            topicsQuery = topicsQuery.where('paper', '==', paper);
        }

        topicsQuery = topicsQuery.orderBy('paper').orderBy('name');

        const topicsSnapshot = await topicsQuery.get();

        if (topicsSnapshot.empty) {
            return NextResponse.json({ topics: [] }, { headers: corsHeaders });
        }

        // Fetch subtopics and sources for each topic
        const topicsWithRelations = await Promise.all(
            topicsSnapshot.docs.map(async (topicDoc) => {
                const topic = topicDoc.data();
                const topicId = topicDoc.id;

                // Fetch subtopics subcollection
                const subtopicsSnapshot = await db
                    .collection('roadmap_topics')
                    .doc(topicId)
                    .collection('subtopics')
                    .orderBy('order')
                    .get();

                // Fetch sources subcollection
                const sourcesSnapshot = await db
                    .collection('roadmap_topics')
                    .doc(topicId)
                    .collection('sources')
                    .orderBy('order')
                    .get();

                return {
                    id: topicId,
                    name: topic.name,
                    description: topic.description,
                    paper: topic.paper,
                    icon: topic.icon,
                    color: topic.color,
                    estimatedHours: topic.estimatedHours,
                    subtopics: subtopicsSnapshot.docs.map(st => {
                        const stData = st.data();
                        return {
                            id: st.id,
                            name: stData.name,
                            estimatedHours: stData.estimatedHours,
                        };
                    }),
                    sources: sourcesSnapshot.docs.map(src => {
                        const srcData = src.data();
                        return {
                            type: srcData.type,
                            name: srcData.name,
                            link: srcData.link,
                        };
                    }),
                };
            })
        );

        return NextResponse.json({ topics: topicsWithRelations }, { headers: corsHeaders });
    } catch (error: any) {
        console.error('Get roadmap error:', error);
        return NextResponse.json({
            error: 'Internal server error',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        }, { status: 500, headers: corsHeaders });
    }
}
