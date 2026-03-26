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
export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const articleId = params.id;

        if (!articleId) {
            return NextResponse.json({ error: 'Invalid article ID' }, { status: 400, headers: corsHeaders });
        }

        const db = getAdminDb();
        const docRef = db.collection('articles').doc(articleId);
        const docSnap = await docRef.get();

        if (!docSnap.exists) {
            return NextResponse.json({ error: 'Article not found' }, { status: 404, headers: corsHeaders });
        }

        const data = docSnap.data()!;

        if (!data.isPublished) {
            return NextResponse.json({ error: 'Article not found' }, { status: 404, headers: corsHeaders });
        }

        const article = {
            id: docSnap.id,
            ...data,
            publishedDate: data.publishedDate?.toDate?.() || data.publishedDate,
            createdAt: data.createdAt?.toDate?.() || data.createdAt,
            updatedAt: data.updatedAt?.toDate?.() || data.updatedAt,
        };

        return NextResponse.json({ article }, { headers: corsHeaders });
    } catch (error) {
        console.error('Get article error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500, headers: corsHeaders });
    }
}
