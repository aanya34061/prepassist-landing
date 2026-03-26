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
    // Deduplicate
    return [...new Set(words)];
}

// GET /api/mobile/notes - List notes for a user
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const userId = searchParams.get('userId');
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '20');
        const isArchived = searchParams.get('isArchived');

        if (!userId) {
            return NextResponse.json(
                { success: false, error: 'User ID required' },
                { status: 400, headers: corsHeaders }
            );
        }

        const db = getAdminDb();

        // Build query
        let query: FirebaseFirestore.Query = db.collection('notes')
            .where('userId', '==', userId);

        if (isArchived !== null && isArchived !== undefined) {
            query = query.where('isArchived', '==', isArchived === 'true');
        } else {
            // By default, don't show archived notes
            query = query.where('isArchived', '==', false);
        }

        // Get total count
        const countSnapshot = await query.count().get();
        const totalCount = countSnapshot.data().count;

        // Get paginated results, ordered by pinned first then updatedAt
        const snapshot = await query
            .orderBy('isPinned', 'desc')
            .orderBy('updatedAt', 'desc')
            .offset((page - 1) * limit)
            .limit(limit)
            .get();

        // Fetch tags for each note
        const notesWithTags = await Promise.all(
            snapshot.docs.map(async (doc) => {
                const noteData = doc.data();
                const noteId = doc.id;

                // Fetch tags from the note's tagIds array
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

                return {
                    id: noteId,
                    userId: noteData.userId,
                    title: noteData.title,
                    content: noteData.content,
                    plainText: noteData.plainText,
                    isPinned: noteData.isPinned || false,
                    isArchived: noteData.isArchived || false,
                    createdAt: noteData.createdAt?.toDate?.() || noteData.createdAt,
                    updatedAt: noteData.updatedAt?.toDate?.() || noteData.updatedAt,
                    tags: noteTags,
                };
            })
        );

        return NextResponse.json({
            success: true,
            notes: notesWithTags,
            pagination: {
                page,
                limit,
                total: totalCount || 0,
                totalPages: Math.ceil((totalCount || 0) / limit),
            },
        }, { headers: corsHeaders });
    } catch (error) {
        console.error('List notes error:', error);
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500, headers: corsHeaders }
        );
    }
}

// POST /api/mobile/notes - Create a new note
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { userId, title, content, plainText: rawPlainText, tagIds = [] } = body;

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
                { success: false, error: `User with ID ${userId} not found` },
                { status: 404, headers: corsHeaders }
            );
        }

        // Use provided plainText or extract from content
        const plainText = rawPlainText || extractPlainText(content);

        // Generate search tokens for text search
        const searchTokens = generateSearchTokens(`${title} ${plainText}`);

        // Create the note
        const now = new Date();
        const noteData: Record<string, any> = {
            userId: String(userId),
            title,
            content: content || null,
            plainText,
            searchTokens,
            isPinned: false,
            isArchived: false,
            tagIds: tagIds.map((id: string | number) => String(id)),
            createdAt: now,
            updatedAt: now,
        };

        const docRef = await db.collection('notes').add(noteData);
        const newNote = { id: docRef.id, ...noteData };

        // Fetch attached tags
        let attachedTags: any[] = [];
        if (tagIds.length > 0) {
            const tagIdsStr = tagIds.map((id: string | number) => String(id));
            const tagsSnapshot = await db.collection('tags')
                .where('__name__', 'in', tagIdsStr.slice(0, 10))
                .get();
            attachedTags = tagsSnapshot.docs.map(tagDoc => ({
                id: tagDoc.id,
                name: tagDoc.data().name,
                color: tagDoc.data().color,
            }));
        }

        return NextResponse.json({
            success: true,
            note: {
                ...newNote,
                tags: attachedTags,
            },
        }, { status: 201, headers: corsHeaders });
    } catch (error) {
        console.error('Create note error:', error);
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500, headers: corsHeaders }
        );
    }
}
