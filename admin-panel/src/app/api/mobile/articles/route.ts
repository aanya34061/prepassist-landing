import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
};

// Handle preflight requests
export async function OPTIONS() {
    return NextResponse.json({}, { headers: corsHeaders });
}

// Public endpoint - no auth required
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '20');
        const source = searchParams.get('source'); // TH, ET, or PIB
        const gsPaper = searchParams.get('gsPaper'); // Keep for backward compatibility
        const subject = searchParams.get('subject');
        const dateParam = searchParams.get('date');

        const db = getAdminDb();

        // Map source abbreviations to full names
        const sourceMap: { [key: string]: string } = {
            'TH': 'The Hindu',
            'ET': 'The Economic Times',
            'PIB': 'Press Information Bureau',
        };

        let query: FirebaseFirestore.Query = db.collection('articles')
            .where('isPublished', '==', true);

        // If source parameter is provided, use it; otherwise fall back to gsPaper for backward compatibility
        if (source && sourceMap[source]) {
            query = query.where('gsPaper', '==', sourceMap[source]);
        } else if (gsPaper) {
            query = query.where('gsPaper', '==', gsPaper);
        }

        if (subject) {
            query = query.where('subject', '==', subject);
        }

        if (dateParam) {
            const startDate = new Date(dateParam);
            startDate.setHours(0, 0, 0, 0);

            const endDate = new Date(dateParam);
            endDate.setHours(23, 59, 59, 999);

            query = query
                .where('publishedDate', '>=', startDate)
                .where('publishedDate', '<=', endDate);
        }

        // Get total count
        const countSnapshot = await query.count().get();
        const totalCount = countSnapshot.data().count;

        // Get paginated results
        const snapshot = await query
            .orderBy('createdAt', 'desc')
            .offset((page - 1) * limit)
            .limit(limit)
            .get();

        if (snapshot.empty) {
            return NextResponse.json({
                articles: [],
                pagination: {
                    page,
                    limit,
                    total: totalCount || 0,
                    totalPages: Math.ceil((totalCount || 0) / limit),
                },
            }, { headers: corsHeaders });
        }

        const transformedArticles = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                title: data.title,
                author: data.author,
                summary: data.summary,
                gsPaper: data.gsPaper,
                subject: data.subject,
                tags: data.tags,
                publishedDate: data.publishedDate?.toDate?.() || data.publishedDate,
                createdAt: data.createdAt?.toDate?.() || data.createdAt,
            };
        });

        return NextResponse.json({
            articles: transformedArticles,
            pagination: {
                page,
                limit,
                total: totalCount || 0,
                totalPages: Math.ceil((totalCount || 0) / limit),
            },
        }, { headers: corsHeaders });
    } catch (error) {
        console.error('Get articles error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500, headers: corsHeaders });
    }
}
