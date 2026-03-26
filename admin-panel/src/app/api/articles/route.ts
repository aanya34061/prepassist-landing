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
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '20');
        const search = searchParams.get('search') || '';
        const gsPaper = searchParams.get('gsPaper') || '';
        const subject = searchParams.get('subject') || '';
        const status = searchParams.get('status') || '';

        const db = getAdminDb();
        let query: FirebaseFirestore.Query = db.collection('articles');

        if (gsPaper && gsPaper !== 'all') {
            query = query.where('gsPaper', '==', gsPaper);
        }

        if (subject && subject !== 'all') {
            query = query.where('subject', '==', subject);
        }

        if (status === 'published') {
            query = query.where('isPublished', '==', true);
        } else if (status === 'draft') {
            query = query.where('isPublished', '==', false);
        }

        query = query.orderBy('createdAt', 'desc');

        // Get total count
        const countSnapshot = await query.count().get();
        const total = countSnapshot.data().count;

        // Pagination with offset simulation (cursor-based would be better for large datasets)
        const offset = (page - 1) * limit;
        const snapshot = await query.offset(offset).limit(limit).get();

        let articles = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
        }));

        // Client-side search filter (Firestore doesn't support ILIKE)
        if (search) {
            const searchLower = search.toLowerCase();
            articles = articles.filter(a =>
                (a as any).title?.toLowerCase().includes(searchLower) ||
                (a as any).summary?.toLowerCase().includes(searchLower)
            );
        }

        return NextResponse.json({
            articles,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        });
    } catch (error) {
        console.error('Get articles error:', error);
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
        const { title, author, publishedDate, summary, metaDescription, content, images, sourceUrl, gsPaper, subject, tags, isPublished } = body;

        if (!title) {
            return NextResponse.json({ error: 'Title is required' }, { status: 400 });
        }

        const db = getAdminDb();

        const articleData = {
            title,
            author: author || null,
            publishedDate: publishedDate ? new Date(publishedDate) : null,
            summary: summary || null,
            metaDescription: metaDescription || null,
            content: content || [],
            images: images || [],
            sourceUrl: sourceUrl || null,
            gsPaper: gsPaper || null,
            subject: subject || null,
            tags: tags || [],
            isPublished: isPublished || false,
            scrapedAt: new Date(),
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        const docRef = await db.collection('articles').add(articleData);

        return NextResponse.json({
            article: { id: docRef.id, ...articleData },
        }, { status: 201 });
    } catch (error) {
        console.error('Create article error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
