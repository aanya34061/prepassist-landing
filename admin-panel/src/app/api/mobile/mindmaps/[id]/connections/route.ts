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

// Add a new connection
export async function POST(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const mindMapId = params.id;
        const body = await request.json();
        const { connectionId, sourceNodeId, targetNodeId, label, color, strokeWidth, style, animated } = body;

        if (!connectionId || !sourceNodeId || !targetNodeId) {
            return NextResponse.json(
                { success: false, error: 'Connection ID, source and target node IDs required' },
                { status: 400, headers: corsHeaders }
            );
        }

        const db = getAdminDb();

        // Check if connection already exists (either direction)
        const connectionsRef = db
            .collection('mind_maps')
            .doc(mindMapId)
            .collection('connections');

        const forwardSnapshot = await connectionsRef
            .where('sourceNodeId', '==', sourceNodeId)
            .where('targetNodeId', '==', targetNodeId)
            .get();

        const reverseSnapshot = await connectionsRef
            .where('sourceNodeId', '==', targetNodeId)
            .where('targetNodeId', '==', sourceNodeId)
            .get();

        if (!forwardSnapshot.empty || !reverseSnapshot.empty) {
            return NextResponse.json(
                { success: false, error: 'Connection already exists' },
                { status: 400, headers: corsHeaders }
            );
        }

        console.log('[API] Creating connection:', { mindMapId, connectionId, sourceNodeId, targetNodeId });

        const connectionData = {
            mindMapId,
            connectionId,
            sourceNodeId,
            targetNodeId,
            label: label || null,
            color: color || '#94A3B8',
            strokeWidth: Math.round(strokeWidth) || 2,
            style: style || 'solid',
            animated: animated || false,
            createdAt: new Date(),
        };

        // Use connectionId as the document ID
        await connectionsRef.doc(connectionId).set(connectionData);

        console.log('[API] Connection created:', connectionData);

        // Update mind map timestamp
        await db.collection('mind_maps').doc(mindMapId).update({
            updatedAt: new Date(),
        });

        return NextResponse.json({
            success: true,
            connection: { id: connectionId, ...connectionData },
        }, { status: 201, headers: corsHeaders });
    } catch (error) {
        console.error('Create connection error:', error);
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500, headers: corsHeaders }
        );
    }
}

// Update a connection
export async function PUT(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const mindMapId = params.id;
        const body = await request.json();
        const { connectionId, label, color, strokeWidth, style, animated } = body;

        if (!connectionId) {
            return NextResponse.json(
                { success: false, error: 'Connection ID required' },
                { status: 400, headers: corsHeaders }
            );
        }

        const db = getAdminDb();
        const connectionRef = db
            .collection('mind_maps')
            .doc(mindMapId)
            .collection('connections')
            .doc(connectionId);

        const connectionDoc = await connectionRef.get();
        if (!connectionDoc.exists) {
            return NextResponse.json(
                { success: false, error: 'Connection not found' },
                { status: 404, headers: corsHeaders }
            );
        }

        const updateData: any = {};
        if (label !== undefined) updateData.label = label;
        if (color !== undefined) updateData.color = color;
        if (strokeWidth !== undefined) updateData.strokeWidth = strokeWidth;
        if (style !== undefined) updateData.style = style;
        if (animated !== undefined) updateData.animated = animated;

        await connectionRef.update(updateData);

        const updatedDoc = await connectionRef.get();

        return NextResponse.json({
            success: true,
            connection: { id: updatedDoc.id, ...updatedDoc.data() },
        }, { headers: corsHeaders });
    } catch (error) {
        console.error('Update connection error:', error);
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500, headers: corsHeaders }
        );
    }
}

// Delete a connection
export async function DELETE(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const mindMapId = params.id;
        const { searchParams } = new URL(request.url);
        const connectionId = searchParams.get('connectionId');

        if (!connectionId) {
            return NextResponse.json(
                { success: false, error: 'Connection ID required' },
                { status: 400, headers: corsHeaders }
            );
        }

        const db = getAdminDb();
        const connectionRef = db
            .collection('mind_maps')
            .doc(mindMapId)
            .collection('connections')
            .doc(connectionId);

        const connectionDoc = await connectionRef.get();
        if (!connectionDoc.exists) {
            return NextResponse.json(
                { success: false, error: 'Connection not found' },
                { status: 404, headers: corsHeaders }
            );
        }

        await connectionRef.delete();

        // Update mind map timestamp
        await db.collection('mind_maps').doc(mindMapId).update({
            updatedAt: new Date(),
        });

        return NextResponse.json({
            success: true,
            message: 'Connection deleted',
        }, { headers: corsHeaders });
    } catch (error) {
        console.error('Delete connection error:', error);
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500, headers: corsHeaders }
        );
    }
}

// Delete all connections for a node (when node is deleted)
export async function PATCH(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const mindMapId = params.id;
        const body = await request.json();
        const { nodeId } = body;

        if (!nodeId) {
            return NextResponse.json(
                { success: false, error: 'Node ID required' },
                { status: 400, headers: corsHeaders }
            );
        }

        const db = getAdminDb();
        const connectionsRef = db
            .collection('mind_maps')
            .doc(mindMapId)
            .collection('connections');

        // Find connections where this node is the source
        const sourceSnapshot = await connectionsRef
            .where('sourceNodeId', '==', nodeId)
            .get();

        // Find connections where this node is the target
        const targetSnapshot = await connectionsRef
            .where('targetNodeId', '==', nodeId)
            .get();

        let deletedCount = 0;
        const batch = db.batch();

        sourceSnapshot.docs.forEach(doc => {
            batch.delete(doc.ref);
            deletedCount++;
        });

        targetSnapshot.docs.forEach(doc => {
            batch.delete(doc.ref);
            deletedCount++;
        });

        if (deletedCount > 0) {
            await batch.commit();
        }

        return NextResponse.json({
            success: true,
            deletedCount,
        }, { headers: corsHeaders });
    } catch (error) {
        console.error('Delete node connections error:', error);
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500, headers: corsHeaders }
        );
    }
}
