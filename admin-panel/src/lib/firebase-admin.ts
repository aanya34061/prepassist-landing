import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';
import { getAuth, Auth } from 'firebase-admin/auth';

let app: App;
let adminDb: Firestore;
let adminAuth: Auth;

function getFirebaseAdmin() {
  if (!getApps().length) {
    const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

    if (serviceAccountKey) {
      try {
        const serviceAccount = JSON.parse(serviceAccountKey);
        app = initializeApp({
          credential: cert(serviceAccount),
        });
      } catch {
        console.error('Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY. Ensure it is valid JSON.');
        throw new Error('Invalid FIREBASE_SERVICE_ACCOUNT_KEY');
      }
    } else {
      // Fallback: use application default credentials (for local dev with gcloud CLI)
      app = initializeApp({
        projectId: 'prepassist-68ef1',
      });
      console.warn('FIREBASE_SERVICE_ACCOUNT_KEY not set. Using default credentials.');
    }
  } else {
    app = getApps()[0];
  }

  if (!adminDb) {
    adminDb = getFirestore(app);
  }
  if (!adminAuth) {
    adminAuth = getAuth(app);
  }

  return { app, db: adminDb, auth: adminAuth };
}

// Export lazy-initialized singletons
export const getAdminApp = () => getFirebaseAdmin().app;
export const getAdminDb = () => getFirebaseAdmin().db;
export const getAdminAuth = () => getFirebaseAdmin().auth;
