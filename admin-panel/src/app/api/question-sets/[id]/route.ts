import { NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';
import { verifyAuth } from '@/lib/auth';
import { syncQuestionSetDelete, syncQuestionSetTogglePublish } from '@/lib/supabase-sync';

export async function GET(req: Request, { params }: { params: { id: string } }) {
    try {
        const { id } = params;
        const db = getAdminDb();

        // Get the set details
        const setDoc = await db.collection('question_sets').doc(id).get();

        if (!setDoc.exists) {
            return NextResponse.json({ error: 'Question set not found' }, { status: 404 });
        }

        const setData = { id: setDoc.id, ...setDoc.data() };

        // Get questions from subcollection
        const questionsSnapshot = await db
            .collection('question_sets')
            .doc(id)
            .collection('questions')
            .orderBy('createdAt', 'desc')
            .get();

        const questions = questionsSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
        }));

        return NextResponse.json({
            ...setData,
            questions,
        });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
    try {
        const { id } = params;
        const db = getAdminDb();

        const setDoc = await db.collection('question_sets').doc(id).get();
        if (!setDoc.exists) {
            return NextResponse.json({ error: 'Question set not found' }, { status: 404 });
        }

        // Delete all questions in the subcollection first
        const questionsSnapshot = await db
            .collection('question_sets')
            .doc(id)
            .collection('questions')
            .get();

        const batch = db.batch();
        questionsSnapshot.docs.forEach(doc => {
            batch.delete(doc.ref);
        });

        // Delete the question set document itself
        batch.delete(db.collection('question_sets').doc(id));

        await batch.commit();
        await syncQuestionSetDelete(id);

        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
    try {
        const { id } = params;
        const body = await req.json();
        const db = getAdminDb();

        await db.collection('question_sets').doc(id).update({
            isPublished: body.isPublished,
            updatedAt: new Date().toISOString(),
        });
        await syncQuestionSetTogglePublish(id, body.isPublished);

        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
