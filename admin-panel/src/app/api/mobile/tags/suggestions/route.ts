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

// GET /api/mobile/tags/suggestions?prefix= - Get tag suggestions
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const prefix = searchParams.get('prefix') || '';
        const limit = parseInt(searchParams.get('limit') || '10');

        const db = getAdminDb();

        let suggestions: any[];

        if (prefix.length > 0) {
            const prefixLower = prefix.toLowerCase();
            // Firestore range query for prefix matching
            // Use >= prefix and < prefix + high Unicode char for startsWith behavior
            const endPrefix = prefixLower.slice(0, -1) + String.fromCharCode(prefixLower.charCodeAt(prefixLower.length - 1) + 1);

            const prefixSnapshot = await db.collection('tags')
                .where('name', '>=', prefixLower)
                .where('name', '<', endPrefix)
                .orderBy('name')
                .limit(limit)
                .get();

            suggestions = prefixSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                createdAt: doc.data().createdAt?.toDate?.() || doc.data().createdAt,
                updatedAt: doc.data().updatedAt?.toDate?.() || doc.data().updatedAt,
            }));

            // If not enough suggestions, also search for tags containing the prefix
            if (suggestions.length < limit) {
                // Fetch all tags and filter client-side for contains match
                const allTagsSnapshot = await db.collection('tags')
                    .orderBy('usageCount', 'desc')
                    .get();

                const existingIds = new Set(suggestions.map(s => s.id));
                const containingSuggestions = allTagsSnapshot.docs
                    .filter(doc => {
                        const name = doc.data().name || '';
                        return name.includes(prefixLower) && !name.startsWith(prefixLower) && !existingIds.has(doc.id);
                    })
                    .slice(0, limit - suggestions.length)
                    .map(doc => ({
                        id: doc.id,
                        ...doc.data(),
                        createdAt: doc.data().createdAt?.toDate?.() || doc.data().createdAt,
                        updatedAt: doc.data().updatedAt?.toDate?.() || doc.data().updatedAt,
                    }));

                suggestions = [...suggestions, ...containingSuggestions];
            }
        } else {
            // Return most popular tags when no prefix
            const snapshot = await db.collection('tags')
                .orderBy('usageCount', 'desc')
                .limit(limit)
                .get();

            suggestions = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                createdAt: doc.data().createdAt?.toDate?.() || doc.data().createdAt,
                updatedAt: doc.data().updatedAt?.toDate?.() || doc.data().updatedAt,
            }));
        }

        return NextResponse.json({
            success: true,
            suggestions,
        }, { headers: corsHeaders });
    } catch (error) {
        console.error('Tag suggestions error:', error);
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500, headers: corsHeaders }
        );
    }
}
