import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuth, getAdminDb } from '@/lib/firebase-admin';
import bcrypt from 'bcryptjs';

export async function POST(request: NextRequest) {
    try {
        console.log('Signup request received');
        const { email, password, name } = await request.json();

        if (!email || !password) {
            return NextResponse.json(
                { error: 'Email and password are required' },
                { status: 400 }
            );
        }

        console.log('Creating user:', email);

        const auth = getAdminAuth();
        const db = getAdminDb();

        // Check if admin user already exists in Firestore
        const existingSnapshot = await db.collection('admin_users')
            .where('email', '==', email)
            .limit(1)
            .get();

        if (!existingSnapshot.empty) {
            return NextResponse.json(
                { error: 'An account with this email already exists. Please sign in instead.' },
                { status: 400 }
            );
        }

        // Create Firebase Auth user
        let firebaseUser;
        try {
            firebaseUser = await auth.createUser({
                email,
                password,
                displayName: name || email.split('@')[0],
                emailVerified: true,
            });
        } catch (err: any) {
            if (err.code === 'auth/email-already-exists') {
                return NextResponse.json(
                    { error: 'An account with this email already exists.' },
                    { status: 400 }
                );
            }
            throw err;
        }

        // Hash password for Firestore admin_users
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create admin user doc in Firestore
        await db.collection('admin_users').doc(firebaseUser.uid).set({
            email: email.toLowerCase(),
            password: hashedPassword,
            name: name || email.split('@')[0],
            role: 'admin',
            createdAt: new Date(),
        });

        console.log('User created successfully:', email);

        // Create a custom token to sign them in
        const customToken = await auth.createCustomToken(firebaseUser.uid, {
            role: 'admin',
            email,
        });

        return NextResponse.json({
            success: true,
            user: {
                id: firebaseUser.uid,
                email: firebaseUser.email,
                name: name || email.split('@')[0],
            },
            token: customToken,
        }, { status: 201 });
    } catch (error) {
        console.error('Signup error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
