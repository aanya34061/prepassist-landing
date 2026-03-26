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

// GET /api/mobile/tags/[id] - Get a single tag
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        if (!id) {
            return NextResponse.json(
                { success: false, error: 'Invalid tag ID' },
                { status: 400, headers: corsHeaders }
            );
        }

        const db = getAdminDb();
        const tagDoc = await db.collection('tags').doc(id).get();

        if (!tagDoc.exists) {
            return NextResponse.json(
                { success: false, error: 'Tag not found' },
                { status: 404, headers: corsHeaders }
            );
        }

        const tagData = tagDoc.data()!;

        return NextResponse.json({
            success: true,
            tag: {
                id: tagDoc.id,
                ...tagData,
                createdAt: tagData.createdAt?.toDate?.() || tagData.createdAt,
                updatedAt: tagData.updatedAt?.toDate?.() || tagData.updatedAt,
            },
        }, { headers: corsHeaders });
    } catch (error) {
        console.error('Get tag error:', error);
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500, headers: corsHeaders }
        );
    }
}

// PUT /api/mobile/tags/[id] - Update a tag
export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const body = await request.json();
        const { name, color } = body;

        if (!id) {
            return NextResponse.json(
                { success: false, error: 'Invalid tag ID' },
                { status: 400, headers: corsHeaders }
            );
        }

        const db = getAdminDb();
        const tagRef = db.collection('tags').doc(id);
        const tagDoc = await tagRef.get();

        if (!tagDoc.exists) {
            return NextResponse.json(
                { success: false, error: 'Tag not found' },
                { status: 404, headers: corsHeaders }
            );
        }

        // Build update object
        const updateData: Record<string, any> = {
            updatedAt: new Date(),
        };

        if (name !== undefined) {
            const normalizedName = name.trim().toLowerCase();

            // Check if another tag with this name exists
            const duplicateSnapshot = await db.collection('tags')
                .where('name', '==', normalizedName)
                .limit(1)
                .get();

            if (!duplicateSnapshot.empty && duplicateSnapshot.docs[0].id !== id) {
                return NextResponse.json(
                    { success: false, error: 'A tag with this name already exists' },
                    { status: 409, headers: corsHeaders }
                );
            }

            updateData.name = normalizedName;
        }

        if (color !== undefined) {
            updateData.color = color;
        }

        await tagRef.update(updateData);

        const updatedDoc = await tagRef.get();
        const updatedData = updatedDoc.data()!;

        return NextResponse.json({
            success: true,
            tag: {
                id: updatedDoc.id,
                ...updatedData,
                createdAt: updatedData.createdAt?.toDate?.() || updatedData.createdAt,
                updatedAt: updatedData.updatedAt?.toDate?.() || updatedData.updatedAt,
            },
        }, { headers: corsHeaders });
    } catch (error) {
        console.error('Update tag error:', error);
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500, headers: corsHeaders }
        );
    }
}

// DELETE /api/mobile/tags/[id] - Delete a tag
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        if (!id) {
            return NextResponse.json(
                { success: false, error: 'Invalid tag ID' },
                { status: 400, headers: corsHeaders }
            );
        }

        const db = getAdminDb();
        const tagRef = db.collection('tags').doc(id);
        const tagDoc = await tagRef.get();

        if (!tagDoc.exists) {
            return NextResponse.json(
                { success: false, error: 'Tag not found' },
                { status: 404, headers: corsHeaders }
            );
        }

        await tagRef.delete();

        return NextResponse.json({
            success: true,
            message: 'Tag deleted successfully',
        }, { headers: corsHeaders });
    } catch (error) {
        console.error('Delete tag error:', error);
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500, headers: corsHeaders }
        );
    }
}
