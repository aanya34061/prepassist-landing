import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuth, getAdminDb } from '@/lib/firebase-admin';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
    return NextResponse.json({}, { headers: corsHeaders });
}

// Login user by email (syncs with Firestore user doc)
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { email, idToken } = body;

        if (!email) {
            return NextResponse.json(
                { success: false, error: 'Email is required' },
                { status: 400, headers: corsHeaders }
            );
        }

        const auth = getAdminAuth();
        const db = getAdminDb();

        // If ID token is provided, verify with Firebase Auth
        let firebaseUid: string | null = null;
        if (idToken) {
            try {
                const decodedToken = await auth.verifyIdToken(idToken);
                firebaseUid = decodedToken.uid;
            } catch {
                return NextResponse.json(
                    { success: false, error: 'Invalid authentication token' },
                    { status: 401, headers: corsHeaders }
                );
            }
        }

        // Find user by email in Firestore
        const usersSnapshot = await db.collection('users')
            .where('email', '==', email.toLowerCase())
            .limit(1)
            .get();

        if (!usersSnapshot.empty) {
            const userDoc = usersSnapshot.docs[0];
            const userData = userDoc.data();

            // Check if user is active
            if (userData.isActive === false) {
                return NextResponse.json(
                    { success: false, error: 'Account is deactivated. Please contact support.' },
                    { status: 403, headers: corsHeaders }
                );
            }

            // Update last login
            await userDoc.ref.update({
                lastLogin: new Date(),
                updatedAt: new Date(),
            });

            return NextResponse.json({
                success: true,
                user: { id: userDoc.id, ...userData, lastLogin: new Date().toISOString() },
                isNewUser: false,
            }, { headers: corsHeaders });
        }

        // User doesn't exist - create new from Firebase Auth user
        if (!firebaseUid) {
            return NextResponse.json(
                { success: false, error: 'User not found. Please sign up first.' },
                { status: 404, headers: corsHeaders }
            );
        }

        // Get Firebase Auth user info
        const firebaseUser = await auth.getUser(firebaseUid);

        const newUserData = {
            email: firebaseUser.email!.toLowerCase(),
            name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
            phone: firebaseUser.phoneNumber || null,
            picture: firebaseUser.photoURL || null,
            provider: firebaseUser.providerData?.[0]?.providerId || 'email',
            role: 'student',
            isGuest: false,
            isActive: true,
            lastLogin: new Date(),
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        // Use Firebase UID as document ID
        await db.collection('users').doc(firebaseUid).set(newUserData);

        return NextResponse.json({
            success: true,
            user: { id: firebaseUid, ...newUserData },
            isNewUser: true,
        }, { status: 201, headers: corsHeaders });
    } catch (error) {
        console.error('Login error:', error);
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500, headers: corsHeaders }
        );
    }
}
