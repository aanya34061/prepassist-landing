import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
};

// Handle preflight requests
export async function OPTIONS() {
    return NextResponse.json({}, { headers: corsHeaders });
}

// Public endpoint - no auth required
export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const mapId = params.id;

        if (!mapId) {
            return NextResponse.json({ error: 'Invalid map ID' }, { status: 400, headers: corsHeaders });
        }

        const db = getAdminDb();
        const docSnap = await db.collection('maps').doc(mapId).get();

        if (!docSnap.exists) {
            return NextResponse.json({ error: 'Map not found' }, { status: 404, headers: corsHeaders });
        }

        const data = docSnap.data()!;

        if (!data.isPublished) {
            return NextResponse.json({ error: 'Map not found' }, { status: 404, headers: corsHeaders });
        }

        const map = {
            id: docSnap.id,
            ...data,
            createdAt: data.createdAt?.toDate?.() || data.createdAt,
            updatedAt: data.updatedAt?.toDate?.() || data.updatedAt,
        };

        return NextResponse.json({ map }, { headers: corsHeaders });
    } catch (error) {
        console.error('Get map error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500, headers: corsHeaders });
    }
}
