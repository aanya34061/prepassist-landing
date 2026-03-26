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

// Helper function to extract plain text from Lexical JSON
function extractPlainText(content: any): string {
    if (!content) return '';

    let text = '';

    const extractFromNode = (node: any) => {
        if (node.text) {
            text += node.text + ' ';
        }
        if (node.children && Array.isArray(node.children)) {
            node.children.forEach(extractFromNode);
        }
    };

    if (content.root) {
        extractFromNode(content.root);
    } else if (content.children) {
        content.children.forEach(extractFromNode);
    }

    return text.trim();
}

// Helper function to generate search tokens from text
function generateSearchTokens(text: string): string[] {
    if (!text) return [];
    const words = text.toLowerCase().split(/\s+/).filter(w => w.length > 1);
    return [...new Set(words)];
}

// GET /api/mobile/notes/[id] - Get a single note
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        if (!id) {
            return NextResponse.json(
                { success: false, error: 'Invalid note ID' },
                { status: 400, headers: corsHeaders }
            );
        }

        const db = getAdminDb();
        const noteDoc = await db.collection('notes').doc(id).get();

        if (!noteDoc.exists) {
            return NextResponse.json(
                { success: false, error: 'Note not found' },
                { status: 404, headers: corsHeaders }
            );
        }

        const noteData = noteDoc.data()!;

        // Fetch tags for this note
        let noteTags: any[] = [];
        if (noteData.tagIds && noteData.tagIds.length > 0) {
            const tagsSnapshot = await db.collection('tags')
                .where('__name__', 'in', noteData.tagIds.slice(0, 10))
                .get();
            noteTags = tagsSnapshot.docs.map(tagDoc => ({
                id: tagDoc.id,
                name: tagDoc.data().name,
                color: tagDoc.data().color,
            }));
        }

        return NextResponse.json({
            success: true,
            note: {
                id: noteDoc.id,
                ...noteData,
                createdAt: noteData.createdAt?.toDate?.() || noteData.createdAt,
                updatedAt: noteData.updatedAt?.toDate?.() || noteData.updatedAt,
                tags: noteTags,
            },
        }, { headers: corsHeaders });
    } catch (error) {
        console.error('Get note error:', error);
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500, headers: corsHeaders }
        );
    }
}

// PUT /api/mobile/notes/[id] - Update a note
export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const body = await request.json();
        const { title, content, plainText: rawPlainText, tagIds, isPinned, isArchived } = body;

        if (!id) {
            return NextResponse.json(
                { success: false, error: 'Invalid note ID' },
                { status: 400, headers: corsHeaders }
            );
        }

        const db = getAdminDb();
        const noteRef = db.collection('notes').doc(id);
        const noteDoc = await noteRef.get();

        if (!noteDoc.exists) {
            return NextResponse.json(
                { success: false, error: 'Note not found' },
                { status: 404, headers: corsHeaders }
            );
        }

        // Build update object
        const updateData: Record<string, any> = {
            updatedAt: new Date(),
        };

        if (title !== undefined) {
            updateData.title = title;
        }

        // Handle plainText - use provided or extract from content
        if (rawPlainText !== undefined) {
            updateData.plainText = rawPlainText;
        } else if (content !== undefined) {
            updateData.content = content;
            updateData.plainText = extractPlainText(content);
        }

        if (isPinned !== undefined) {
            updateData.isPinned = isPinned;
        }

        if (isArchived !== undefined) {
            updateData.isArchived = isArchived;
        }

        // Update tags if provided
        if (tagIds !== undefined) {
            updateData.tagIds = tagIds.map((tid: string | number) => String(tid));
        }

        // Regenerate search tokens if text changed
        if (updateData.title || updateData.plainText) {
            const existingData = noteDoc.data()!;
            const newTitle = updateData.title || existingData.title || '';
            const newPlainText = updateData.plainText || existingData.plainText || '';
            updateData.searchTokens = generateSearchTokens(`${newTitle} ${newPlainText}`);
        }

        await noteRef.update(updateData);

        // Get updated document
        const updatedDoc = await noteRef.get();
        const updatedData = updatedDoc.data()!;

        // Fetch updated tags
        let noteTags: any[] = [];
        const noteTagIds = updatedData.tagIds || [];
        if (noteTagIds.length > 0) {
            const tagsSnapshot = await db.collection('tags')
                .where('__name__', 'in', noteTagIds.slice(0, 10))
                .get();
            noteTags = tagsSnapshot.docs.map(tagDoc => ({
                id: tagDoc.id,
                name: tagDoc.data().name,
                color: tagDoc.data().color,
            }));
        }

        return NextResponse.json({
            success: true,
            note: {
                id: updatedDoc.id,
                ...updatedData,
                createdAt: updatedData.createdAt?.toDate?.() || updatedData.createdAt,
                updatedAt: updatedData.updatedAt?.toDate?.() || updatedData.updatedAt,
                tags: noteTags,
            },
        }, { headers: corsHeaders });
    } catch (error) {
        console.error('Update note error:', error);
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500, headers: corsHeaders }
        );
    }
}

// DELETE /api/mobile/notes/[id] - Delete a note
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        if (!id) {
            return NextResponse.json(
                { success: false, error: 'Invalid note ID' },
                { status: 400, headers: corsHeaders }
            );
        }

        const db = getAdminDb();
        const noteRef = db.collection('notes').doc(id);
        const noteDoc = await noteRef.get();

        if (!noteDoc.exists) {
            return NextResponse.json(
                { success: false, error: 'Note not found' },
                { status: 404, headers: corsHeaders }
            );
        }

        await noteRef.delete();

        return NextResponse.json({
            success: true,
            message: 'Note deleted successfully',
        }, { headers: corsHeaders });
    } catch (error) {
        console.error('Delete note error:', error);
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500, headers: corsHeaders }
        );
    }
}
