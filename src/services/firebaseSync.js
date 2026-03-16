/**
 * firebaseSync.js
 * Syncs user stats and streak to Firebase Firestore (Demomap project).
 * Called automatically after every test completion.
 */
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';

/**
 * Sync stats to Firestore under: userStats/{userId}
 */
export const syncStatsToFirebase = async (userId, stats) => {
  if (!userId) return;
  try {
    await setDoc(
      doc(db, 'userStats', userId),
      {
        ...stats,
        lastSynced: serverTimestamp(),
      },
      { merge: true }
    );
    console.log('[Firebase] Stats synced for user:', userId);
  } catch (error) {
    // Silent fail — local data is always the source of truth
    console.warn('[Firebase] Stats sync failed (offline?):', error.message);
  }
};

/**
 * Sync streak to Firestore under: userStreak/{userId}
 */
export const syncStreakToFirebase = async (userId, streak) => {
  if (!userId) return;
  try {
    await setDoc(
      doc(db, 'userStreak', userId),
      {
        ...streak,
        lastSynced: serverTimestamp(),
      },
      { merge: true }
    );
    console.log('[Firebase] Streak synced for user:', userId);
  } catch (error) {
    console.warn('[Firebase] Streak sync failed (offline?):', error.message);
  }
};

/**
 * Sync both stats and streak at once
 */
export const syncAllToFirebase = async (userId, stats, streak) => {
  await Promise.allSettled([
    syncStatsToFirebase(userId, stats),
    syncStreakToFirebase(userId, streak),
  ]);
};
