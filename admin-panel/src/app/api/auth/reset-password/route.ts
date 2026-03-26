import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
    // Firebase handles password reset entirely via email link.
    // The client SDK (or Firebase hosted page) handles the actual password update.
    // This endpoint is kept for backward compatibility but just returns a message.

    try {
        return NextResponse.json({
            success: true,
            message: 'Password reset is handled via Firebase email link. Please check your email.'
        });
    } catch (error) {
        console.error('Reset password error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
