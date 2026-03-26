import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
    return NextResponse.json({}, { headers: corsHeaders });
}

// Create a guest user for quick access without registration
export async function POST(request: NextRequest) {
    try {
        const body = await request.json().catch(() => ({}));
        const { deviceId } = body;

        const db = getAdminDb();

        // Generate unique guest identifier
        const guestId = deviceId || `guest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const guestEmail = `guest_${guestId}@guest.local`;

        // Check if this guest already exists
        const existingSnapshot = await db.collection('users')
            .where('email', '==', guestEmail)
            .limit(1)
            .get();

        if (!existingSnapshot.empty) {
            const guestDoc = existingSnapshot.docs[0];
            const guestData = guestDoc.data();

            await guestDoc.ref.update({
                lastLogin: new Date(),
                updatedAt: new Date(),
            });

            return NextResponse.json({
                success: true,
                user: { id: guestDoc.id, ...guestData },
                message: 'Guest session restored',
            }, { headers: corsHeaders });
        }

        // Create new guest user
        const newGuestData = {
            email: guestEmail,
            name: 'Guest User',
            provider: 'guest',
            role: 'student',
            isGuest: true,
            isActive: true,
            lastLogin: new Date(),
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        const newDocRef = await db.collection('users').add(newGuestData);

        return NextResponse.json({
            success: true,
            user: { id: newDocRef.id, ...newGuestData },
            message: 'Guest account created',
        }, { status: 201, headers: corsHeaders });
    } catch (error) {
        console.error('Guest login error:', error);
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500, headers: corsHeaders }
        );
    }
}
