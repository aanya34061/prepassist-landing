/**
 * firebaseNotesSync.js
 * Syncs notes to/from Firebase Firestore.
 * Firestore path: userNotes/{userId}/notes/{noteId}
 * Local-first: AsyncStorage is primary, Firestore is background sync.
 */
import {
  doc,
  setDoc,
  deleteDoc,
  collection,
  getDocs,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { uploadNoteFileBlocks } from './firebaseStorageService';

const COLLECTION = 'userNotes';
const SUB_COLLECTION = 'notes';

/**
 * Remove undefined values from an object (Firestore rejects undefined).
 */
const stripUndefined = (obj) => {
  return JSON.parse(JSON.stringify(obj));
};

/**
 * Upsert a single note to Firestore.
 * Fire-and-forget — does not throw on failure.
 */
export const syncNoteToFirebase = async (userId, note) => {
  if (!userId || !note?.id) return;
  try {
    // Upload local file blocks (images/PDFs) to Firebase Storage
    let processedNote = { ...note };
    if (note.blocks?.length > 0) {
      processedNote.blocks = await uploadNoteFileBlocks(userId, note.id, note.blocks);
    }

    const noteDoc = doc(db, COLLECTION, userId, SUB_COLLECTION, String(note.id));
    await setDoc(
      noteDoc,
      {
        ...stripUndefined(processedNote),
        lastSynced: serverTimestamp(),
      },
      { merge: true }
    );
    console.log('[Firebase] Note synced:', note.id);
  } catch (error) {
    console.warn('[Firebase] Note sync failed (offline?):', error.message);
  }
};

/**
 * Delete a single note from Firestore.
 */
export const deleteNoteFromFirebase = async (userId, noteId) => {
  if (!userId || !noteId) return;
  try {
    const noteDoc = doc(db, COLLECTION, userId, SUB_COLLECTION, String(noteId));
    await deleteDoc(noteDoc);
    console.log('[Firebase] Note deleted:', noteId);
  } catch (error) {
    console.warn('[Firebase] Note delete failed (offline?):', error.message);
  }
};

/**
 * Fetch all notes for a user from Firestore.
 * Returns an array of note objects, or empty array on failure.
 */
export const fetchNotesFromFirebase = async (userId) => {
  if (!userId) return [];
  try {
    const notesRef = collection(db, COLLECTION, userId, SUB_COLLECTION);
    const snapshot = await getDocs(notesRef);
    const notes = [];
    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      // Remove Firestore-only fields
      const { lastSynced, ...noteData } = data;
      notes.push(noteData);
    });
    console.log('[Firebase] Fetched', notes.length, 'notes from server');
    return notes;
  } catch (error) {
    console.warn('[Firebase] Fetch notes failed (offline?):', error.message);
    return [];
  }
};
