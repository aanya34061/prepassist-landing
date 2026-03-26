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
        const { id } = params;
        const db = getAdminDb();

        const mapRef = db.collection('maps').doc(id);
        const mapDoc = await mapRef.get();

        if (!mapDoc.exists) {
            return NextResponse.json({ error: 'Map not found' }, { status: 404 });
        }

        const map = mapDoc.data()!;
        const newIsPublished = !map.isPublished;

        await mapRef.update({
            isPublished: newIsPublished,
            updatedAt: new Date().toISOString(),
        });

        const updatedDoc = await mapRef.get();
        const updatedMap = { id: updatedDoc.id, ...updatedDoc.data() };

        return NextResponse.json({ map: updatedMap });
    } catch (error) {
        console.error('Toggle publish error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
