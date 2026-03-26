import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';
import { verifyAuth } from '@/lib/auth';

export async function GET(request: NextRequest) {
    const user = await verifyAuth(request);
    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const db = getAdminDb();

        const [usersCount, mapsCount, articlesCount, publishedArticlesCount] = await Promise.all([
            db.collection('users').count().get(),
            db.collection('maps').count().get(),
            db.collection('articles').count().get(),
            db.collection('articles').where('isPublished', '==', true).count().get(),
        ]);

        return NextResponse.json({
            stats: {
                totalUsers: usersCount.data().count || 0,
                totalMaps: mapsCount.data().count || 0,
                totalArticles: articlesCount.data().count || 0,
                publishedArticles: publishedArticlesCount.data().count || 0,
            },
        });
    } catch (error) {
        console.error('Get stats error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
