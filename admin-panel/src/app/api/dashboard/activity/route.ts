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
        const limit = parseInt(searchParams.get('limit') || '20');

        const db = getAdminDb();

        const snapshot = await db.collection('activity_logs')
            .orderBy('createdAt', 'desc')
            .limit(limit)
            .get();

        const activities = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
        }));

        return NextResponse.json({ activities });
    } catch (error) {
        console.error('Get activity error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
