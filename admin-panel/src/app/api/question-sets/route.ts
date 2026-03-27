import { NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';
import { verifyAuth } from '@/lib/auth';
import { syncQuestionSetCreate } from '@/lib/supabase-sync';

export async function GET() {
    try {
        const db = getAdminDb();

        const snapshot = await db
            .collection('question_sets')
            .orderBy('createdAt', 'desc')
            .get();

        const sets = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
        }));

        return NextResponse.json(sets);
    } catch (error: any) {
        console.error('Get question sets error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { title, description, year } = body;

        if (!title) {
            return NextResponse.json({ error: 'Title is required' }, { status: 400 });
        }

        const db = getAdminDb();
        const now = new Date().toISOString();

        const newSetData = {
            title,
            description: description || null,
            year: year ? parseInt(year) : new Date().getFullYear(),
            isPublished: false,
            publishedDate: body.publishedDate || now,
            createdAt: now,
            updatedAt: now,
        };

        const docRef = await db.collection('question_sets').add(newSetData);
        await syncQuestionSetCreate(docRef.id, newSetData);

        return NextResponse.json({
            id: docRef.id,
            ...newSetData,
        });
    } catch (error: any) {
        console.error('Create question set error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
