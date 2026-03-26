import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
    return NextResponse.json({}, { headers: corsHeaders });
}

// Register a new user (syncs Firebase Auth user to Firestore)
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { email, name, phone, picture, provider = 'email', uid } = body;

        if (!email || !name) {
            return NextResponse.json(
                { success: false, error: 'Email and name are required' },
                { status: 400, headers: corsHeaders }
            );
        }

        const db = getAdminDb();

        // Check if user already exists by email
        const existingSnapshot = await db.collection('users')
            .where('email', '==', email.toLowerCase())
            .limit(1)
            .get();

        if (!existingSnapshot.empty) {
            const existingDoc = existingSnapshot.docs[0];
            const existingData = existingDoc.data();

            // Update last login
            await existingDoc.ref.update({
                lastLogin: new Date(),
                updatedAt: new Date(),
            });

            return NextResponse.json({
                success: true,
                user: { id: existingDoc.id, ...existingData },
                message: 'User already exists, logged in',
            }, { headers: corsHeaders });
        }

        // Create new user doc (use Firebase UID as doc ID if provided)
        const newUserData = {
            email: email.toLowerCase(),
            name,
            phone: phone || null,
            picture: picture || null,
            provider,
            role: 'student',
            isGuest: false,
            isActive: true,
            lastLogin: new Date(),
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        const docId = uid || undefined;
        let newDocRef;
        if (docId) {
            newDocRef = db.collection('users').doc(docId);
            await newDocRef.set(newUserData);
        } else {
            newDocRef = await db.collection('users').add(newUserData);
        }

        return NextResponse.json({
            success: true,
            user: { id: newDocRef.id, ...newUserData },
            message: 'User registered successfully',
        }, { status: 201, headers: corsHeaders });
    } catch (error) {
        console.error('Register error:', error);
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500, headers: corsHeaders }
        );
    }
}
