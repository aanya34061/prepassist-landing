import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
    return NextResponse.json({}, { headers: corsHeaders });
}

// GET /api/mobile/notes/search - Search notes
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const userId = searchParams.get('userId');
        const query = searchParams.get('query') || '';
        const tagNamesParam = searchParams.get('tags') || '';
        const from = searchParams.get('from'); // ISO date string
        const to = searchParams.get('to'); // ISO date string
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '20');

        if (!userId) {
            return NextResponse.json(
                { success: false, error: 'User ID required' },
                { status: 400, headers: corsHeaders }
            );
        }

        const db = getAdminDb();

        // For Firestore, we use searchTokens field with array-contains for single-word queries
        // For multi-word queries, we do client-side filtering after fetching
        const queryTrimmed = query.trim().toLowerCase();
        const queryWords = queryTrimmed.split(/\s+/).filter(w => w.length > 0);

        let firestoreQuery: FirebaseFirestore.Query = db.collection('notes')
            .where('userId', '==', userId);

        // Use array-contains for single word search (Firestore limitation)
        if (queryWords.length === 1) {
            firestoreQuery = firestoreQuery.where('searchTokens', 'array-contains', queryWords[0]);
        }

        // Date range filters
        if (from) {
            const fromDate = new Date(from);
            if (!isNaN(fromDate.getTime())) {
                firestoreQuery = firestoreQuery.where('createdAt', '>=', fromDate);
            }
        }

        if (to) {
            const toDate = new Date(to);
            if (!isNaN(toDate.getTime())) {
                firestoreQuery = firestoreQuery.where('createdAt', '<=', toDate);
            }
        }

        firestoreQuery = firestoreQuery.orderBy('updatedAt', 'desc');

        // Fetch results - we fetch more than needed for client-side filtering
        const fetchLimit = queryWords.length > 1 ? limit * 5 : limit;
        const snapshot = await firestoreQuery
            .limit(fetchLimit + (page - 1) * limit)
            .get();

        let allResults = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt?.toDate?.() || doc.data().createdAt,
            updatedAt: doc.data().updatedAt?.toDate?.() || doc.data().updatedAt,
        }));

        // For multi-word queries, filter client-side
        if (queryWords.length > 1) {
            allResults = allResults.filter((note: any) => {
                const tokens: string[] = note.searchTokens || [];
                return queryWords.every(word => tokens.includes(word));
            });
        }

        // Tag filter
        if (tagNamesParam.trim().length > 0) {
            const tagNames = tagNamesParam.split(',').map(t => t.trim().toLowerCase()).filter(Boolean);

            if (tagNames.length > 0) {
                // Get tag IDs for the given tag names
                const tagsSnapshot = await db.collection('tags').get();
                const tagIdsByName: Record<string, string> = {};
                tagsSnapshot.docs.forEach(doc => {
                    const tagData = doc.data();
                    if (tagNames.includes(tagData.name?.toLowerCase())) {
                        tagIdsByName[tagData.name.toLowerCase()] = doc.id;
                    }
                });

                const matchingTagIds = Object.values(tagIdsByName);

                if (matchingTagIds.length === 0) {
                    return NextResponse.json({
                        success: true,
                        results: [],
                        pagination: {
                            page,
                            limit,
                            total: 0,
                            totalPages: 0,
                        },
                        query: query,
                    }, { headers: corsHeaders });
                }

                // Filter notes that have ALL the specified tags
                allResults = allResults.filter((note: any) => {
                    const noteTagIds: string[] = note.tagIds || [];
                    return matchingTagIds.every(tagId => noteTagIds.includes(tagId));
                });
            }
        }

        // Paginate
        const totalCount = allResults.length;
        const offset = (page - 1) * limit;
        const paginatedResults = allResults.slice(offset, offset + limit);

        // Fetch tags for each result
        const resultsWithTags = await Promise.all(
            paginatedResults.map(async (note: any) => {
                let noteTags: any[] = [];
                if (note.tagIds && note.tagIds.length > 0) {
                    const tagsSnapshot = await db.collection('tags')
                        .where('__name__', 'in', note.tagIds.slice(0, 10))
                        .get();
                    noteTags = tagsSnapshot.docs.map(tagDoc => ({
                        id: tagDoc.id,
                        name: tagDoc.data().name,
                        color: tagDoc.data().color,
                    }));
                }

                // Generate snippet
                let snippet = '';
                if (queryTrimmed.length > 0 && note.plainText) {
                    const textLower = note.plainText.toLowerCase();
                    const index = textLower.indexOf(queryTrimmed);

                    if (index !== -1) {
                        const start = Math.max(0, index - 50);
                        const end = Math.min(note.plainText.length, index + queryTrimmed.length + 50);
                        snippet = (start > 0 ? '...' : '') +
                            note.plainText.slice(start, end) +
                            (end < note.plainText.length ? '...' : '');
                    } else {
                        snippet = note.plainText.slice(0, 100) + (note.plainText.length > 100 ? '...' : '');
                    }
                } else if (note.plainText) {
                    snippet = note.plainText.slice(0, 100) + (note.plainText.length > 100 ? '...' : '');
                }

                return {
                    ...note,
                    tags: noteTags,
                    snippet,
                };
            })
        );

        return NextResponse.json({
            success: true,
            results: resultsWithTags,
            pagination: {
                page,
                limit,
                total: totalCount || 0,
                totalPages: Math.ceil((totalCount || 0) / limit),
            },
            query: query,
        }, { headers: corsHeaders });
    } catch (error) {
        console.error('Search notes error:', error);
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500, headers: corsHeaders }
        );
    }
}
