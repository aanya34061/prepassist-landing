import { NextRequest, NextResponse } from 'next/server';
import { verifyCredentials } from '@/lib/auth';
import { getAdminAuth } from '@/lib/firebase-admin';

export async function POST(request: NextRequest) {
    try {
        console.log('Login attempt received');
        const { email, password } = await request.json();

        if (!email || !password) {
            return NextResponse.json(
                { error: 'Email and password are required' },
                { status: 400 }
            );
        }

        console.log('Verifying credentials for:', email);

        // Verify against Firestore admin_users
        const user = await verifyCredentials(email, password);

        if (!user) {
            return NextResponse.json(
                { error: 'Invalid email or password' },
                { status: 401 }
            );
        }

        // Create a custom token for the admin user
        const auth = getAdminAuth();
        const customToken = await auth.createCustomToken(user.id, {
            role: user.role,
            email: user.email,
        });

        // Create response with user data and token
        const response = NextResponse.json({
            token: customToken,
            user,
        });

        // Set cookie for session management
        response.cookies.set('fb-access-token', customToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 60 * 60 * 24 * 7, // 7 days
        });

        console.log('Login successful for:', email);
        return response;
    } catch (error) {
        console.error('Login error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
