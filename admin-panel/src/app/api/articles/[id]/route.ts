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
        const articleId = params.id;
        const db = getAdminDb();

        const docSnap = await db.collection('articles').doc(articleId).get();

        if (!docSnap.exists) {
            return NextResponse.json({ error: 'Article not found' }, { status: 404 });
        }

        const article = { id: docSnap.id, ...docSnap.data() };

        return NextResponse.json({ article });
    } catch (error) {
        console.error('Get article error:', error);
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
        const articleId = params.id;
        const body = await request.json();
        const {
            title, author, publishedDate, summary, metaDescription,
            content, images, gsPaper, subject, tags, isPublished
        } = body;

        const db = getAdminDb();
        const docRef = db.collection('articles').doc(articleId);

        // Verify article exists
        const docSnap = await docRef.get();
        if (!docSnap.exists) {
            return NextResponse.json({ error: 'Article not found' }, { status: 404 });
        }

        const updateData: Record<string, any> = { updatedAt: new Date() };
        if (title !== undefined) updateData.title = title;
        if (author !== undefined) updateData.author = author;
        if (publishedDate !== undefined) updateData.publishedDate = publishedDate ? new Date(publishedDate) : null;
        if (summary !== undefined) updateData.summary = summary;
        if (metaDescription !== undefined) updateData.metaDescription = metaDescription;
        if (content !== undefined) updateData.content = content;
        if (images !== undefined) updateData.images = images;
        if (gsPaper !== undefined) updateData.gsPaper = gsPaper;
        if (subject !== undefined) updateData.subject = subject;
        if (tags !== undefined) updateData.tags = tags;
        if (isPublished !== undefined) updateData.isPublished = isPublished;

        await docRef.update(updateData);

        // Fetch the updated document to return
        const updatedSnap = await docRef.get();
        const updatedArticle = { id: updatedSnap.id, ...updatedSnap.data() };

        console.log(`Article "${updatedArticle.title}" was updated`);

        return NextResponse.json({ article: updatedArticle });
    } catch (error) {
        console.error('Update article error:', error);
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
        const articleId = params.id;
        const db = getAdminDb();
        const docRef = db.collection('articles').doc(articleId);

        // First get the article to log its title
        const docSnap = await docRef.get();
        if (!docSnap.exists) {
            return NextResponse.json({ error: 'Article not found' }, { status: 404 });
        }

        const articleData = docSnap.data();

        // Delete all MCQs in the subcollection first
        const mcqsSnapshot = await docRef.collection('mcqs').get();
        const batch = db.batch();
        mcqsSnapshot.docs.forEach(mcqDoc => {
            batch.delete(mcqDoc.ref);
        });
        // Delete the article document itself
        batch.delete(docRef);
        await batch.commit();

        console.log(`Article "${articleData?.title}" was deleted`);

        return NextResponse.json({ message: 'Article deleted successfully' });
    } catch (error) {
        console.error('Delete article error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
