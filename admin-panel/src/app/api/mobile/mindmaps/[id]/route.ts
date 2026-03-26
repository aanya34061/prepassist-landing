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

// Get a single mind map with all nodes and connections
export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const mindMapId = params.id;

        const db = getAdminDb();
        const mindMapDoc = await db.collection('mind_maps').doc(mindMapId).get();

        if (!mindMapDoc.exists) {
            return NextResponse.json(
                { success: false, error: 'Mind map not found' },
                { status: 404, headers: corsHeaders }
            );
        }

        const mindMapData = mindMapDoc.data()!;

        // Fetch nodes subcollection
        const nodesSnapshot = await db
            .collection('mind_maps')
            .doc(mindMapId)
            .collection('nodes')
            .get();

        const nodes = nodesSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt?.toDate?.() || doc.data().createdAt,
            updatedAt: doc.data().updatedAt?.toDate?.() || doc.data().updatedAt,
        }));

        // Fetch connections subcollection
        const connectionsSnapshot = await db
            .collection('mind_maps')
            .doc(mindMapId)
            .collection('connections')
            .get();

        const connections = connectionsSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
        }));

        console.log('[API] Mind map ID:', mindMapId);
        console.log('[API] Nodes count:', nodes.length);
        console.log('[API] Connections count:', connections.length);
        console.log('[API] Connections:', JSON.stringify(connections, null, 2));

        return NextResponse.json({
            success: true,
            mindMap: {
                id: mindMapDoc.id,
                ...mindMapData,
                createdAt: mindMapData.createdAt?.toDate?.() || mindMapData.createdAt,
                updatedAt: mindMapData.updatedAt?.toDate?.() || mindMapData.updatedAt,
                nodes,
                connections,
            },
        }, { headers: corsHeaders });
    } catch (error) {
        console.error('Get mind map error:', error);
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500, headers: corsHeaders }
        );
    }
}

// Update mind map (title, description, canvas state)
export async function PUT(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const mindMapId = params.id;
        const body = await request.json();
        const { title, description, canvasState, tags } = body;

        const db = getAdminDb();
        const mindMapRef = db.collection('mind_maps').doc(mindMapId);
        const mindMapDoc = await mindMapRef.get();

        if (!mindMapDoc.exists) {
            return NextResponse.json(
                { success: false, error: 'Mind map not found' },
                { status: 404, headers: corsHeaders }
            );
        }

        const updateData: any = { updatedAt: new Date() };
        if (title !== undefined) updateData.title = title;
        if (description !== undefined) updateData.description = description;
        if (canvasState !== undefined) updateData.canvasState = canvasState;
        if (tags !== undefined) updateData.tags = tags;

        await mindMapRef.update(updateData);

        const updatedDoc = await mindMapRef.get();
        const updatedData = updatedDoc.data()!;

        return NextResponse.json({
            success: true,
            mindMap: {
                id: updatedDoc.id,
                ...updatedData,
                createdAt: updatedData.createdAt?.toDate?.() || updatedData.createdAt,
                updatedAt: updatedData.updatedAt?.toDate?.() || updatedData.updatedAt,
            },
        }, { headers: corsHeaders });
    } catch (error) {
        console.error('Update mind map error:', error);
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500, headers: corsHeaders }
        );
    }
}

// Delete mind map (manually delete subcollections too)
export async function DELETE(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const mindMapId = params.id;

        const db = getAdminDb();
        const mindMapRef = db.collection('mind_maps').doc(mindMapId);
        const mindMapDoc = await mindMapRef.get();

        if (!mindMapDoc.exists) {
            return NextResponse.json(
                { success: false, error: 'Mind map not found' },
                { status: 404, headers: corsHeaders }
            );
        }

        // Delete nodes subcollection
        const nodesSnapshot = await mindMapRef.collection('nodes').get();
        const batch1 = db.batch();
        nodesSnapshot.docs.forEach(doc => batch1.delete(doc.ref));
        if (!nodesSnapshot.empty) await batch1.commit();

        // Delete connections subcollection
        const connectionsSnapshot = await mindMapRef.collection('connections').get();
        const batch2 = db.batch();
        connectionsSnapshot.docs.forEach(doc => batch2.delete(doc.ref));
        if (!connectionsSnapshot.empty) await batch2.commit();

        // Delete the mind map document itself
        await mindMapRef.delete();

        return NextResponse.json({
            success: true,
            message: 'Mind map deleted',
        }, { headers: corsHeaders });
    } catch (error) {
        console.error('Delete mind map error:', error);
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500, headers: corsHeaders }
        );
    }
}
