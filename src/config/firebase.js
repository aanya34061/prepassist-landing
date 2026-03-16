import { initializeApp, getApps } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// Firebase configuration for "test-7ca86" project
// Values sourced from: android/app/google-services.json
const firebaseConfig = {
  apiKey: 'AIzaSyDZmmcDQSMH1adae7D7tJVE7yo_z3YCMrc',
  authDomain: 'test-7ca86.firebaseapp.com',
  projectId: 'test-7ca86',
  storageBucket: 'test-7ca86.firebasestorage.app',
  messagingSenderId: '78687357578',
  appId: '1:78687357578:android:5ae96274937abad6ebbb73',
};

// Prevent re-initialising the app on hot-reloads
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

export const db = getFirestore(app);
export const storage = getStorage(app);

export default app;
