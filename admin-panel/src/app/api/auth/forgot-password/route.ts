import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuth } from '@/lib/firebase-admin';

export async function POST(request: NextRequest) {
    try {
        console.log('Forgot password request received');
        const { email } = await request.json();

        if (!email) {
            return NextResponse.json(
                { error: 'Email is required' },
                { status: 400 }
            );
        }

        console.log('Generating password reset link for:', email);

        const auth = getAdminAuth();

        try {
            const resetLink = await auth.generatePasswordResetLink(email);
            console.log('Password reset link generated for:', email);
            // In production, send this link via your own email service.
            // Firebase Auth also sends the email automatically when using client SDK.
            console.log('Reset link:', resetLink);
        } catch (err: any) {
            // Don't reveal whether the email exists
            console.log('generatePasswordResetLink error (may be expected):', err.code);
        }

        // Always return success for security (don't reveal email existence)
        return NextResponse.json({
            success: true,
            message: 'If an account exists with this email, a password reset link has been sent.'
        });
    } catch (error) {
        console.error('Forgot password error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
