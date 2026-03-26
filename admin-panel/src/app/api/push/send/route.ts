import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';
import { verifyAuth } from '@/lib/auth';

// Engagespot API credentials
const ENGAGESPOT_API_KEY = 'n6csieradej08ctf465vlhr';
const ENGAGESPOT_API_SECRET = 'karibass84a8lpb17aggnejcc454246j1hf36j2710ii36jc';
const ENGAGESPOT_API_URL = 'https://api.engagespot.co/v3/notifications';

interface EngagespotNotification {
    notification: {
        title: string;
        message: string;
        icon?: string;
        url?: string;
    };
    recipients: string[];
    sendTo?: {
        allUsers?: boolean;
    };
}

export async function POST(request: NextRequest) {
    const user = await verifyAuth(request);
    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { title, body, contentType, contentId, contentUrl } = await request.json();

        if (!title || !body) {
            return NextResponse.json(
                { error: 'Title and body are required' },
                { status: 400 }
            );
        }

        const db = getAdminDb();

        // Get all users from Firestore
        const usersSnapshot = await db.collection('users').get();

        if (usersSnapshot.empty) {
            return NextResponse.json(
                { error: 'No users found to send notification' },
                { status: 400 }
            );
        }

        const userIds = usersSnapshot.docs.map(doc => doc.id);

        // Prepare Engagespot notification payload
        const engagespotPayload: EngagespotNotification = {
            notification: {
                title,
                message: body,
                icon: 'https://prepassist.in/icon.png',
                url: contentUrl || undefined,
            },
            recipients: userIds,
        };

        // Send notification via Engagespot API
        const engagespotResponse = await fetch(ENGAGESPOT_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-ENGAGESPOT-API-KEY': ENGAGESPOT_API_KEY,
                'X-ENGAGESPOT-API-SECRET': ENGAGESPOT_API_SECRET,
            },
            body: JSON.stringify(engagespotPayload),
        });

        const engagespotResult = await engagespotResponse.json();

        if (!engagespotResponse.ok) {
            console.error('Engagespot API error:', engagespotResult);
            return NextResponse.json(
                { error: 'Failed to send notification via Engagespot', details: engagespotResult },
                { status: 500 }
            );
        }

        // Save to notifications collection in Firestore for history
        await db.collection('notifications').add({
            title,
            body,
            type: contentType || 'general',
            contentId: contentId || null,
            contentUrl: contentUrl || null,
            isRead: false,
            recipientCount: userIds.length,
            status: 'delivered',
            metadata: engagespotResult,
            createdAt: new Date(),
        });

        return NextResponse.json({
            success: true,
            message: 'Notification sent via Engagespot!',
            engagespotResponse: engagespotResult,
        });

    } catch (error) {
        console.error('Send notification error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

export async function GET(request: NextRequest) {
    const user = await verifyAuth(request);
    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const db = getAdminDb();

        const snapshot = await db.collection('notifications')
            .orderBy('createdAt', 'desc')
            .limit(50)
            .get();

        const notifications = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
        }));

        return NextResponse.json({
            notifications,
            message: 'Use POST to send a new notification via Engagespot',
        });
    } catch (error) {
        console.error('Fetch notifications error:', error);
        return NextResponse.json({ error: 'Failed to fetch notifications' }, { status: 500 });
    }
}
