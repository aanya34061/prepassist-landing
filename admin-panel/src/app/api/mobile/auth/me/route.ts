import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
    return NextResponse.json({}, { headers: corsHeaders });
}

// Get user profile by ID (Firestore doc ID = Firebase UID)
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const userId = searchParams.get('userId');

        if (!userId) {
            return NextResponse.json(
                { success: false, error: 'User ID is required' },
                { status: 400, headers: corsHeaders }
            );
        }

        const db = getAdminDb();
        const userDoc = await db.collection('users').doc(userId).get();

        if (!userDoc.exists) {
            return NextResponse.json(
                { success: false, error: 'User not found' },
                { status: 404, headers: corsHeaders }
            );
        }

        return NextResponse.json({
            success: true,
            user: { id: userDoc.id, ...userDoc.data() },
        }, { headers: corsHeaders });
    } catch (error) {
        console.error('Get user error:', error);
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500, headers: corsHeaders }
        );
    }
}

// Update user profile
export async function PUT(request: NextRequest) {
    try {
        const body = await request.json();
        const { userId, name, phone, picture } = body;

        if (!userId) {
            return NextResponse.json(
                { success: false, error: 'User ID is required' },
                { status: 400, headers: corsHeaders }
            );
        }

        const db = getAdminDb();
        const userRef = db.collection('users').doc(userId);
        const userDoc = await userRef.get();

        if (!userDoc.exists) {
            return NextResponse.json(
                { success: false, error: 'User not found' },
                { status: 404, headers: corsHeaders }
            );
        }

        const updates: Record<string, any> = { updatedAt: new Date() };
        if (name) updates.name = name;
        if (phone !== undefined) updates.phone = phone;
        if (picture !== undefined) updates.picture = picture;

        await userRef.update(updates);

        const updatedDoc = await userRef.get();

        return NextResponse.json({
            success: true,
            user: { id: updatedDoc.id, ...updatedDoc.data() },
        }, { headers: corsHeaders });
    } catch (error) {
        console.error('Update user error:', error);
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500, headers: corsHeaders }
        );
    }
}

// Delete user account (soft delete by deactivating)
export async function DELETE(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const userId = searchParams.get('userId');

        if (!userId) {
            return NextResponse.json(
                { success: false, error: 'User ID is required' },
                { status: 400, headers: corsHeaders }
            );
        }

        const db = getAdminDb();
        const userRef = db.collection('users').doc(userId);
        const userDoc = await userRef.get();

        if (!userDoc.exists) {
            return NextResponse.json(
                { success: false, error: 'User not found' },
                { status: 404, headers: corsHeaders }
            );
        }

        // Soft delete - deactivate the account
        await userRef.update({
            isActive: false,
            updatedAt: new Date(),
        });

        return NextResponse.json({
            success: true,
            message: 'Account deactivated successfully',
        }, { headers: corsHeaders });
    } catch (error) {
        console.error('Delete user error:', error);
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500, headers: corsHeaders }
        );
    }
}
