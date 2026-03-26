import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';
import { verifyAuth } from '@/lib/auth';
import { writeFile, mkdir, unlink } from 'fs/promises';
import path from 'path';

export async function GET(
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

        const mapDoc = await db.collection('maps').doc(id).get();

        if (!mapDoc.exists) {
            return NextResponse.json({ error: 'Map not found' }, { status: 404 });
        }

        return NextResponse.json({ map: { id: mapDoc.id, ...mapDoc.data() } });
    } catch (error) {
        console.error('Get map error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function PUT(
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
        const formData = await request.formData();
        const title = formData.get('title') as string;
        const description = formData.get('description') as string;
        const category = formData.get('category') as string;
        const tagsStr = formData.get('tags') as string;
        const isPublished = formData.get('isPublished') === 'true';
        const image = formData.get('image') as File | null;

        const updateData: any = { updatedAt: new Date().toISOString() };
        if (title) updateData.title = title;
        if (description !== undefined) updateData.description = description;
        if (category) updateData.category = category;
        if (tagsStr !== undefined) {
            updateData.tags = tagsStr.split(',').map((t: string) => t.trim()).filter((t: string) => t);
        }
        updateData.isPublished = isPublished;

        if (image) {
            const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'maps');
            await mkdir(uploadsDir, { recursive: true });

            const fileName = `${Date.now()}-${image.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
            const filePath = path.join(uploadsDir, fileName);
            const buffer = Buffer.from(await image.arrayBuffer());
            await writeFile(filePath, buffer);

            updateData.imageUrl = `/uploads/maps/${fileName}`;
        }

        const mapRef = db.collection('maps').doc(id);
        const mapDoc = await mapRef.get();

        if (!mapDoc.exists) {
            return NextResponse.json({ error: 'Map not found' }, { status: 404 });
        }

        await mapRef.update(updateData);

        const updatedDoc = await mapRef.get();
        const updatedMap = { id: updatedDoc.id, ...updatedDoc.data() };

        return NextResponse.json({ map: updatedMap });
    } catch (error) {
        console.error('Update map error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function DELETE(
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

        // Try to delete the file using imageUrl
        if (map.imageUrl && map.imageUrl.startsWith('/uploads/')) {
            try {
                const filePath = path.join(process.cwd(), 'public', map.imageUrl);
                await unlink(filePath);
            } catch (e) {
                // Ignore file deletion errors
            }
        }

        await mapRef.delete();

        return NextResponse.json({ message: 'Map deleted successfully' });
    } catch (error) {
        console.error('Delete map error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
