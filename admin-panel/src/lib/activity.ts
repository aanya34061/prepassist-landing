import { getAdminDb } from './firebase-admin';

export async function logActivity(
    action: string,
    entityType: string,
    entityId: string | number | null,
    description: string,
    metadata?: Record<string, any>
) {
    try {
        const db = getAdminDb();
        await db.collection('activity_logs').add({
            action,
            entityType,
            entityId,
            description,
            metadata: metadata || null,
            createdAt: new Date().toISOString(),
        });
    } catch (error) {
        console.error('Activity log error:', error);
    }
}
