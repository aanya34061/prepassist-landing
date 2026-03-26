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

// Add a new node
export async function POST(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const mindMapId = params.id;
        const body = await request.json();
        const { nodeId, label, x, y, color, shape, referenceType, referenceId, metadata } = body;

        if (!nodeId || !label) {
            return NextResponse.json(
                { success: false, error: 'Node ID and label required' },
                { status: 400, headers: corsHeaders }
            );
        }

        const db = getAdminDb();
        const now = new Date();

        const nodeData = {
            mindMapId,
            nodeId,
            label,
            x: x || 0,
            y: y || 0,
            color: color || '#3B82F6',
            shape: shape || 'rounded',
            referenceType: referenceType || null,
            referenceId: referenceId || null,
            metadata: metadata || null,
            createdAt: now,
            updatedAt: now,
        };

        // Use nodeId as the document ID for easy lookup
        await db
            .collection('mind_maps')
            .doc(mindMapId)
            .collection('nodes')
            .doc(nodeId)
            .set(nodeData);

        // Update mind map timestamp
        await db.collection('mind_maps').doc(mindMapId).update({
            updatedAt: now,
        });

        return NextResponse.json({
            success: true,
            node: { id: nodeId, ...nodeData },
        }, { status: 201, headers: corsHeaders });
    } catch (error) {
        console.error('Create node error:', error);
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500, headers: corsHeaders }
        );
    }
}

// Update a node
export async function PUT(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const mindMapId = params.id;
        const body = await request.json();
        const { nodeId, label, x, y, color, shape, width, height, referenceType, referenceId, metadata } = body;

        if (!nodeId) {
            return NextResponse.json(
                { success: false, error: 'Node ID required' },
                { status: 400, headers: corsHeaders }
            );
        }

        const db = getAdminDb();
        const nodeRef = db
            .collection('mind_maps')
            .doc(mindMapId)
            .collection('nodes')
            .doc(nodeId);

        const nodeDoc = await nodeRef.get();
        if (!nodeDoc.exists) {
            return NextResponse.json(
                { success: false, error: 'Node not found' },
                { status: 404, headers: corsHeaders }
            );
        }

        const updateData: any = { updatedAt: new Date() };
        if (label !== undefined) updateData.label = label;
        if (x !== undefined) updateData.x = x;
        if (y !== undefined) updateData.y = y;
        if (color !== undefined) updateData.color = color;
        if (shape !== undefined) updateData.shape = shape;
        if (width !== undefined) updateData.width = width;
        if (height !== undefined) updateData.height = height;
        if (referenceType !== undefined) updateData.referenceType = referenceType;
        if (referenceId !== undefined) updateData.referenceId = referenceId;
        if (metadata !== undefined) updateData.metadata = metadata;

        await nodeRef.update(updateData);

        const updatedDoc = await nodeRef.get();

        // Update mind map timestamp
        await db.collection('mind_maps').doc(mindMapId).update({
            updatedAt: new Date(),
        });

        return NextResponse.json({
            success: true,
            node: { id: updatedDoc.id, ...updatedDoc.data() },
        }, { headers: corsHeaders });
    } catch (error) {
        console.error('Update node error:', error);
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500, headers: corsHeaders }
        );
    }
}

// Delete a node
export async function DELETE(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const mindMapId = params.id;
        const { searchParams } = new URL(request.url);
        const nodeId = searchParams.get('nodeId');

        if (!nodeId) {
            return NextResponse.json(
                { success: false, error: 'Node ID required' },
                { status: 400, headers: corsHeaders }
            );
        }

        const db = getAdminDb();
        const nodeRef = db
            .collection('mind_maps')
            .doc(mindMapId)
            .collection('nodes')
            .doc(nodeId);

        const nodeDoc = await nodeRef.get();
        if (!nodeDoc.exists) {
            return NextResponse.json(
                { success: false, error: 'Node not found' },
                { status: 404, headers: corsHeaders }
            );
        }

        await nodeRef.delete();

        // Update mind map timestamp
        await db.collection('mind_maps').doc(mindMapId).update({
            updatedAt: new Date(),
        });

        return NextResponse.json({
            success: true,
            message: 'Node deleted',
        }, { headers: corsHeaders });
    } catch (error) {
        console.error('Delete node error:', error);
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500, headers: corsHeaders }
        );
    }
}

// Batch update nodes (for moving multiple nodes at once)
export async function PATCH(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const mindMapId = params.id;
        const body = await request.json();
        const { nodes } = body; // Array of { nodeId, x, y }

        if (!nodes || !Array.isArray(nodes)) {
            return NextResponse.json(
                { success: false, error: 'Nodes array required' },
                { status: 400, headers: corsHeaders }
            );
        }

        const db = getAdminDb();
        const now = new Date();
        const batch = db.batch();

        const updatedNodes: any[] = [];

        for (const node of nodes) {
            const nodeRef = db
                .collection('mind_maps')
                .doc(mindMapId)
                .collection('nodes')
                .doc(node.nodeId);

            batch.update(nodeRef, { x: node.x, y: node.y, updatedAt: now });
        }

        // Update mind map timestamp
        batch.update(db.collection('mind_maps').doc(mindMapId), { updatedAt: now });

        await batch.commit();

        // Fetch updated nodes
        for (const node of nodes) {
            const nodeDoc = await db
                .collection('mind_maps')
                .doc(mindMapId)
                .collection('nodes')
                .doc(node.nodeId)
                .get();
            if (nodeDoc.exists) {
                updatedNodes.push({ id: nodeDoc.id, ...nodeDoc.data() });
            }
        }

        return NextResponse.json({
            success: true,
            nodes: updatedNodes,
        }, { headers: corsHeaders });
    } catch (error) {
        console.error('Batch update nodes error:', error);
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500, headers: corsHeaders }
        );
    }
}
