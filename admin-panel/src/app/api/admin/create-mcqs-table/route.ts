import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';

// Legacy endpoint - MCQs are now stored in Firestore, no table creation needed
export async function POST(request: NextRequest) {
    const user = await verifyAuth(request);
    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json({
        success: true,
        message: 'MCQs are stored in Firestore - no table creation needed'
    });
}
