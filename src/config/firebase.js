import { initializeApp, getApps } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// Firebase configuration for "prepassist-68ef1" project
// Must match the admin panel's Firebase project
const firebaseConfig = {
  apiKey: 'AIzaSyA7xzZKXvzspO5HmQsFlHfu3MKi_VoMlGc',
  authDomain: 'prepassist-68ef1.firebaseapp.com',
  projectId: 'prepassist-68ef1',
  storageBucket: 'prepassist-68ef1.firebasestorage.app',
  messagingSenderId: '102154778519',
  appId: '1:102154778519:web:249ffb880d001958f2b6d2',
  measurementId: 'G-FLQBFFC3MX',
};

// Prevent re-initialising the app on hot-reloads
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

export const db = getFirestore(app);
export const storage = getStorage(app);

export default app;
