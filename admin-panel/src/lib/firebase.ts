import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyA7xzZKXvzspO5HmQsFlHfu3MKi_VoMlGc",
  authDomain: "prepassist-68ef1.firebaseapp.com",
  projectId: "prepassist-68ef1",
  storageBucket: "prepassist-68ef1.firebasestorage.app",
  messagingSenderId: "102154778519",
  appId: "1:102154778519:web:249ffb880d001958f2b6d2",
  measurementId: "G-FLQBFFC3MX"
};

// Singleton: reuse existing app if already initialized (important for serverless)
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);

export { app, db };
