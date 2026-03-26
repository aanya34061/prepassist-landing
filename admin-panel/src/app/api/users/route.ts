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
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '20');
        const search = searchParams.get('search') || '';
        const role = searchParams.get('role') || '';
        const offset = (page - 1) * limit;

        const db = getAdminDb();
        let query: FirebaseFirestore.Query = db.collection('users');

        if (role && role !== 'all') {
            query = query.where('role', '==', role);
        }

        query = query.orderBy('createdAt', 'desc');

        // Get total count (respecting filters)
        const countSnapshot = await query.count().get();
        let total = countSnapshot.data().count;

        // Paginate
        const snapshot = await query.offset(offset).limit(limit).get();

        let allUsers = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
        }));

        // Client-side search filter (Firestore doesn't support ILIKE)
        if (search) {
            const searchLower = search.toLowerCase();
            allUsers = allUsers.filter(u =>
                (u as any).name?.toLowerCase().includes(searchLower) ||
                (u as any).email?.toLowerCase().includes(searchLower)
            );
            // When searching client-side, total is approximate since we filter after pagination
            // For a more accurate count, we'd need to fetch all and filter, but this is acceptable for admin use
        }

        return NextResponse.json({
            users: allUsers,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        });
    } catch (error) {
        console.error('Get users error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    const user = await verifyAuth(request);
    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await request.json();
        const { email, name, phone, role, picture } = body;

        if (!email || !name) {
            return NextResponse.json({ error: 'Email and name are required' }, { status: 400 });
        }

        const db = getAdminDb();

        // Check if user already exists
        const existingSnapshot = await db.collection('users')
            .where('email', '==', email)
            .limit(1)
            .get();

        if (!existingSnapshot.empty) {
            return NextResponse.json({ error: 'User already exists' }, { status: 400 });
        }

        const userData = {
            email,
            name,
            phone: phone || null,
            role: role || 'student',
            picture: picture || null,
            provider: 'manual',
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        const docRef = await db.collection('users').add(userData);
        const newUser = { id: docRef.id, ...userData };

        // Log activity
        await db.collection('activity_logs').add({
            action: 'user_created',
            entityType: 'user',
            entityId: docRef.id,
            description: `User "${name}" was created`,
            createdAt: new Date(),
        });

        return NextResponse.json({ user: newUser }, { status: 201 });
    } catch (error) {
        console.error('Create user error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
