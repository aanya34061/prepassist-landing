import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';
import { verifyAuth } from '@/lib/auth';

export async function PATCH(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    const user = await verifyAuth(request);
    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const userId = params.id;
        const db = getAdminDb();

        const userRef = db.collection('users').doc(userId);
        const userDoc = await userRef.get();

        if (!userDoc.exists) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        const foundUser = userDoc.data()!;
        const newIsActive = !foundUser.isActive;

        await userRef.update({
            isActive: newIsActive,
            updatedAt: new Date(),
        });

        const updatedUser = {
            id: userId,
            ...foundUser,
            isActive: newIsActive,
            updatedAt: new Date(),
        };

        // Log activity
        await db.collection('activity_logs').add({
            action: foundUser.isActive ? 'user_deactivated' : 'user_activated',
            entityType: 'user',
            entityId: userId,
            description: `User "${foundUser.name}" was ${foundUser.isActive ? 'deactivated' : 'activated'}`,
            createdAt: new Date(),
        });

        return NextResponse.json({ user: updatedUser });
    } catch (error) {
        console.error('Toggle active error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
