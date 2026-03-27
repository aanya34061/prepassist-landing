import { NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';
import { verifyAuth } from '@/lib/auth';
import { syncPracticeQuestionCreate } from '@/lib/supabase-sync';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { question, optionA, optionB, optionC, optionD, correctAnswer, explanation, questionSetId } = body;

        // Validation
        if (!question || !optionA || !optionB || !optionC || !optionD || !correctAnswer || !explanation) {
            return NextResponse.json({ error: 'All fields are required' }, { status: 400 });
        }

        if (!questionSetId) {
            return NextResponse.json({ error: 'Question Set ID is required' }, { status: 400 });
        }

        const db = getAdminDb();
        const now = new Date().toISOString();

        // Verify the question set exists
        const setDoc = await db.collection('question_sets').doc(questionSetId).get();
        if (!setDoc.exists) {
            return NextResponse.json({ error: 'Question set not found' }, { status: 404 });
        }

        const questionData = {
            questionSetId,
            question,
            optionA,
            optionB,
            optionC,
            optionD,
            correctAnswer,
            explanation,
            createdAt: now,
        };

        // Add question to the subcollection under the question set
        const docRef = await db
            .collection('question_sets')
            .doc(questionSetId)
            .collection('questions')
            .add(questionData);

        const transformedResult = {
            id: docRef.id,
            ...questionData,
        };

        await syncPracticeQuestionCreate(questionSetId, {
            question, optionA, optionB, optionC, optionD, correctAnswer, explanation,
        });

        return NextResponse.json({ success: true, data: transformedResult });

    } catch (error: any) {
        console.error('Error adding question:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
