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

// Get all mind maps for a user
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const userId = searchParams.get('userId');

        if (!userId) {
            return NextResponse.json(
                { success: false, error: 'User ID required' },
                { status: 400, headers: corsHeaders }
            );
        }

        const db = getAdminDb();

        const snapshot = await db.collection('mind_maps')
            .where('userId', '==', userId)
            .orderBy('updatedAt', 'desc')
            .get();

        const userMindMaps = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt?.toDate?.() || doc.data().createdAt,
            updatedAt: doc.data().updatedAt?.toDate?.() || doc.data().updatedAt,
        }));

        return NextResponse.json({
            success: true,
            mindMaps: userMindMaps,
        }, { headers: corsHeaders });
    } catch (error) {
        console.error('Get mind maps error:', error);
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500, headers: corsHeaders }
        );
    }
}

// Create a new mind map
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { userId, title, description, tags } = body;

        if (!userId || !title) {
            return NextResponse.json(
                { success: false, error: 'User ID and title required' },
                { status: 400, headers: corsHeaders }
            );
        }

        const db = getAdminDb();

        // Verify user exists
        const userDoc = await db.collection('users').doc(String(userId)).get();
        if (!userDoc.exists) {
            return NextResponse.json(
                { success: false, error: `User with ID ${userId} not found. Please log in again.` },
                { status: 404, headers: corsHeaders }
            );
        }

        const now = new Date();
        const mindMapData = {
            userId: String(userId),
            title,
            description: description || null,
            tags: tags || [],
            canvasState: null,
            createdAt: now,
            updatedAt: now,
        };

        const docRef = await db.collection('mind_maps').add(mindMapData);
        const newMindMap = { id: docRef.id, ...mindMapData };

        return NextResponse.json({
            success: true,
            mindMap: newMindMap,
        }, { status: 201, headers: corsHeaders });
    } catch (error) {
        console.error('Create mind map error:', error);
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500, headers: corsHeaders }
        );
    }
}
