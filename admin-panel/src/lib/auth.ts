import { NextRequest } from 'next/server';
import { getAdminDb } from './firebase-admin';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || process.env.FIREBASE_SERVICE_ACCOUNT_KEY?.slice(0, 64) || 'admin-panel-secret-key';

export interface AdminUser {
    id: string;
    email: string;
    name?: string;
    role: string;
}

// Verify admin credentials against Firestore admin_users collection
export async function verifyCredentials(email: string, password: string): Promise<AdminUser | null> {
    try {
        const db = getAdminDb();

        // Look up admin user by email
        const snapshot = await db.collection('admin_users')
            .where('email', '==', email)
            .limit(1)
            .get();

        if (snapshot.empty) {
            console.log('Admin user not found:', email);
            return null;
        }

        const adminDoc = snapshot.docs[0];
        const adminData = adminDoc.data();

        // Verify bcrypt password
        const isValid = await bcrypt.compare(password, adminData.password);
        if (!isValid) {
            console.log('Invalid password for:', email);
            return null;
        }

        return {
            id: adminDoc.id,
            email: adminData.email,
            name: adminData.name || email.split('@')[0],
            role: adminData.role || 'admin',
        };
    } catch (error) {
        console.error('Error verifying credentials:', error);
        return null;
    }
}

// Create a JWT token for admin user
export function createToken(user: AdminUser): string {
    return jwt.sign(
        { id: user.id, email: user.email, name: user.name, role: user.role },
        JWT_SECRET,
        { expiresIn: '7d' }
    );
}

// Verify JWT token
export async function verifyToken(token: string): Promise<AdminUser | null> {
    try {
        const decoded = jwt.verify(token, JWT_SECRET) as any;
        if (!decoded || !decoded.id) return null;

        return {
            id: decoded.id,
            email: decoded.email || '',
            name: decoded.name || 'Admin',
            role: decoded.role || 'admin',
        };
    } catch (error) {
        console.error('Error verifying token:', error);
        return null;
    }
}

export function getTokenFromRequest(request: NextRequest): string | null {
    const authHeader = request.headers.get('authorization');
    if (authHeader?.startsWith('Bearer ')) {
        return authHeader.substring(7);
    }
    return request.cookies.get('fb-access-token')?.value || null;
}

// Check if running on localhost (dev mode)
function isDevMode(request: NextRequest): boolean {
    const host = request.headers.get('host') || '';
    return host.includes('localhost') || host.includes('127.0.0.1') || host.startsWith('192.168');
}

export async function verifyAuth(request: NextRequest): Promise<AdminUser | null> {
    // Dev mode bypass - allow access on localhost without auth
    if (isDevMode(request)) {
        console.log('[DEV] Bypassing auth for localhost');
        return {
            id: 'dev-user',
            email: 'dev@localhost',
            name: 'Dev User',
            role: 'admin',
        };
    }

    const token = getTokenFromRequest(request);
    if (!token) return null;
    return await verifyToken(token);
}
