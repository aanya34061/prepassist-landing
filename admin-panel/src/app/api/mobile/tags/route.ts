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

// GET /api/mobile/tags - List all tags
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const sortBy = searchParams.get('sortBy') || 'name'; // 'name' | 'usageCount' | 'createdAt'
        const order = searchParams.get('order') || 'asc'; // 'asc' | 'desc'

        const db = getAdminDb();

        const orderDirection = order === 'desc' ? 'desc' : 'asc';
        let sortField: string;

        switch (sortBy) {
            case 'usageCount':
                sortField = 'usageCount';
                break;
            case 'createdAt':
                sortField = 'createdAt';
                break;
            default:
                sortField = 'name';
        }

        const snapshot = await db.collection('tags')
            .orderBy(sortField, orderDirection as FirebaseFirestore.OrderByDirection)
            .get();

        const allTags = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt?.toDate?.() || doc.data().createdAt,
            updatedAt: doc.data().updatedAt?.toDate?.() || doc.data().updatedAt,
        }));

        return NextResponse.json({
            success: true,
            tags: allTags,
        }, { headers: corsHeaders });
    } catch (error) {
        console.error('List tags error:', error);
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500, headers: corsHeaders }
        );
    }
}

// POST /api/mobile/tags - Create a new tag
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { name, color } = body;

        if (!name || typeof name !== 'string' || name.trim().length === 0) {
            return NextResponse.json(
                { success: false, error: 'Tag name is required' },
                { status: 400, headers: corsHeaders }
            );
        }

        const normalizedName = name.trim().toLowerCase();

        const db = getAdminDb();

        // Check if tag already exists (case-insensitive by comparing lowercase)
        const existingSnapshot = await db.collection('tags')
            .where('name', '==', normalizedName)
            .limit(1)
            .get();

        if (!existingSnapshot.empty) {
            const existingTag = {
                id: existingSnapshot.docs[0].id,
                ...existingSnapshot.docs[0].data(),
                createdAt: existingSnapshot.docs[0].data().createdAt?.toDate?.() || existingSnapshot.docs[0].data().createdAt,
                updatedAt: existingSnapshot.docs[0].data().updatedAt?.toDate?.() || existingSnapshot.docs[0].data().updatedAt,
            };
            // Return existing tag instead of error
            return NextResponse.json({
                success: true,
                tag: existingTag,
                isExisting: true,
            }, { headers: corsHeaders });
        }

        // Create new tag
        const now = new Date();
        const tagData = {
            name: normalizedName,
            color: color || '#6366F1',
            usageCount: 0,
            createdAt: now,
            updatedAt: now,
        };

        const docRef = await db.collection('tags').add(tagData);
        const newTag = { id: docRef.id, ...tagData };

        return NextResponse.json({
            success: true,
            tag: newTag,
            isExisting: false,
        }, { status: 201, headers: corsHeaders });
    } catch (error) {
        console.error('Create tag error:', error);
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500, headers: corsHeaders }
        );
    }
}
