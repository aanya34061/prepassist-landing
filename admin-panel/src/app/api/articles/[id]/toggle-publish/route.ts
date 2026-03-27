import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';
import { verifyAuth } from '@/lib/auth';
import { syncArticleTogglePublish } from '@/lib/supabase-sync';

export async function PATCH(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    const user = await verifyAuth(request);
    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const articleId = params.id;
        const db = getAdminDb();
        const docRef = db.collection('articles').doc(articleId);

        const docSnap = await docRef.get();
        if (!docSnap.exists) {
            return NextResponse.json({ error: 'Article not found' }, { status: 404 });
        }

        const articleData = docSnap.data()!;
        const newIsPublished = !articleData.isPublished;

        await docRef.update({
            isPublished: newIsPublished,
            updatedAt: new Date(),
        });
        syncArticleTogglePublish(articleId, newIsPublished);

        // Fetch the updated document to return
        const updatedSnap = await docRef.get();
        const updatedArticle = { id: updatedSnap.id, ...updatedSnap.data() };

        console.log(`Article "${articleData.title}" was ${newIsPublished ? 'published' : 'unpublished'}`);

        return NextResponse.json({ article: updatedArticle });
    } catch (error) {
        console.error('Toggle publish error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
