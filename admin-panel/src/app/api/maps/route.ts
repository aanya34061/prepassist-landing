import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';
import { verifyAuth } from '@/lib/auth';

export async function GET(request: NextRequest) {
    const user = await verifyAuth(request);
    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { searchParams } = new URL(request.url);
        const search = searchParams.get('search') || '';

        const db = getAdminDb();
        const snapshot = await db
            .collection('maps')
            .orderBy('createdAt', 'desc')
            .get();

        let allMaps = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
        }));

        if (search) {
            const searchLower = search.toLowerCase();
            allMaps = allMaps.filter(m =>
                (m as any).title?.toLowerCase().includes(searchLower) ||
                (m as any).category?.toLowerCase().includes(searchLower)
            );
        }

        return NextResponse.json({ maps: allMaps });
    } catch (error) {
        console.error('Get maps error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    const user = await verifyAuth(request);
    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const formData = await request.formData();
        const title = formData.get('title') as string;
        const description = formData.get('description') as string;
        const category = formData.get('category') as string;
        const tagsStr = formData.get('tags') as string;
        const isPublished = formData.get('isPublished') === 'true';
        const image = formData.get('image') as File;

        if (!title || !category) {
            return NextResponse.json({ error: 'Title and category are required' }, { status: 400 });
        }

        if (!image) {
            return NextResponse.json({ error: 'Image is required' }, { status: 400 });
        }

        const { writeFile, mkdir } = await import('fs/promises');
        const path = await import('path');
        const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'maps');
        await mkdir(uploadsDir, { recursive: true });

        const fileName = `${Date.now()}-${image.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
        const filePath = path.join(uploadsDir, fileName);
        const buffer = Buffer.from(await image.arrayBuffer());
        await writeFile(filePath, buffer);

        const imageUrl = `/uploads/maps/${fileName}`;
        const tags = tagsStr ? tagsStr.split(',').map(t => t.trim()).filter(t => t) : [];
        const now = new Date().toISOString();

        const db = getAdminDb();
        const mapData = {
            title,
            description: description || null,
            category,
            imageUrl,
            tags,
            isPublished,
            createdAt: now,
            updatedAt: now,
        };

        const docRef = await db.collection('maps').add(mapData);
        const newMap = { id: docRef.id, ...mapData };

        await db.collection('activity_logs').add({
            action: 'map_created',
            entityType: 'map',
            entityId: docRef.id,
            description: `Map "${title}" was uploaded`,
            createdAt: now,
        });

        return NextResponse.json({ map: newMap }, { status: 201 });
    } catch (error) {
        console.error('Create map error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
