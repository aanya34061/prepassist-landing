import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import dotenv from 'dotenv';
import path from 'path';

// Load env from .env.local
dotenv.config({ path: path.resolve(__dirname, '../../.env.local') });

const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

if (!serviceAccountKey) {
    console.error('Missing FIREBASE_SERVICE_ACCOUNT_KEY environment variable');
    process.exit(1);
}

// Initialize Firebase Admin
if (!getApps().length) {
    try {
        const serviceAccount = JSON.parse(serviceAccountKey);
        initializeApp({
            credential: cert(serviceAccount),
        });
    } catch {
        console.error('Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY. Ensure it is valid JSON.');
        process.exit(1);
    }
}

const auth = getAuth();

async function updateAdmin() {
    const email = 'vamsi@prepassist.in';
    const password = 'adminuservamsi';

    console.log(`Updating user: ${email}`);

    try {
        // Try to find user by email
        const user = await auth.getUserByEmail(email).catch(() => null);

        if (!user) {
            console.log('User not found, creating...');
            try {
                const createdUser = await auth.createUser({
                    email,
                    password,
                    emailVerified: true,
                });
                // Set custom claims for admin role
                await auth.setCustomUserClaims(createdUser.uid, { role: 'admin' });
                console.log('User created successfully:', createdUser.uid);
            } catch (createError) {
                console.error('Error creating user:', createError);
            }
        } else {
            console.log('User found, updating password and metadata...');
            try {
                await auth.updateUser(user.uid, {
                    password,
                    emailVerified: true,
                });
                // Set custom claims for admin role
                await auth.setCustomUserClaims(user.uid, { role: 'admin' });
                console.log('User updated successfully');
            } catch (updateError) {
                console.error('Error updating user:', updateError);
            }
        }
    } catch (error) {
        console.error('Error in updateAdmin:', error);
    }
}

updateAdmin();
