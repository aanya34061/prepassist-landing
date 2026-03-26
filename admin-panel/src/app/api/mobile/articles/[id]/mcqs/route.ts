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
    { params }: { params: Promise<{ id: string }> | { id: string } }
) {
    console.log('[MCQs GET] Starting request...');
    try {
        // Handle both Promise and direct params (Next.js 13+ vs 15)
        const resolvedParams = params instanceof Promise ? await params : params;
        console.log('[MCQs GET] Params:', resolvedParams);

        const articleId = resolvedParams.id;
        console.log('[MCQs GET] Article ID:', articleId);

        if (!articleId) {
            console.error('[MCQs GET] Invalid article ID:', resolvedParams.id);
            return NextResponse.json({ error: 'Invalid article ID' }, { status: 400, headers: corsHeaders });
        }

        const db = getAdminDb();

        // Verify article exists and is published
        console.log('[MCQs GET] Fetching article from database...');
        const articleDoc = await db.collection('articles').doc(articleId).get();

        if (!articleDoc.exists || !articleDoc.data()?.isPublished) {
            console.error('[MCQs GET] Article not found or not published:', articleId);
            return NextResponse.json({ error: 'Article not found' }, { status: 404, headers: corsHeaders });
        }

        console.log('[MCQs GET] Article found:', articleDoc.data()?.title);

        // Fetch MCQs from subcollection
        console.log('[MCQs GET] Fetching MCQs from database...');
        try {
            const mcqsSnapshot = await db
                .collection('articles')
                .doc(articleId)
                .collection('mcqs')
                .orderBy('createdAt', 'asc')
                .get();

            const mcqs = mcqsSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                createdAt: doc.data().createdAt?.toDate?.() || doc.data().createdAt,
            }));

            console.log('[MCQs GET] Found MCQs:', mcqs.length);

            return NextResponse.json({
                mcqs,
                count: mcqs.length
            }, { headers: corsHeaders });
        } catch (dbError) {
            console.error('[MCQs GET] Database query error:', dbError);
            console.error('[MCQs GET] Error type:', dbError instanceof Error ? dbError.constructor.name : typeof dbError);
            throw dbError;
        }
    } catch (error) {
        console.error('[MCQs GET] Error details:', error);
        console.error('[MCQs GET] Error stack:', error instanceof Error ? error.stack : 'No stack trace');
        return NextResponse.json({
            error: 'Internal server error',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500, headers: corsHeaders });
    }
}
