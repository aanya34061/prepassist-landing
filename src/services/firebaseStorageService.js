/**
 * firebaseStorageService.js
 * Uploads note file blocks (images, PDFs) to Firebase Storage
 * and returns download URLs for cross-device access.
 *
 * Storage path pattern: notes/{userId}/{noteId}/{timestamp}_{filename}
 */
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from '../config/firebase';

/**
 * Check whether a URI points to a local file (not yet uploaded).
 */
export const isLocalUri = (uri) => {
  if (!uri || typeof uri !== 'string') return false;
  return uri.startsWith('file://') || uri.startsWith('content://');
};

/**
 * Build a unique filename from a local URI and optional prefix.
 */
export const generateFilename = (localUri, prefix = 'file') => {
  const ext = localUri.split('.').pop()?.split('?')[0] || 'bin';
  return `${prefix}_${Date.now()}_${Math.floor(Math.random() * 10000)}.${ext}`;
};

/**
 * Return the Storage path for a note attachment.
 */
export const getNoteFilePath = (userId, noteId, filename) => {
  return `notes/${userId}/${noteId}/${filename}`;
};

/**
 * Upload a single local file to Firebase Storage.
 * Returns the public download URL, or null on failure.
 */
export const uploadFileToStorage = async (localUri, storagePath) => {
  try {
    const response = await fetch(localUri);
    const blob = await response.blob();

    const storageRef = ref(storage, storagePath);
    await uploadBytes(storageRef, blob);

    const downloadURL = await getDownloadURL(storageRef);
    console.log('[Storage] Uploaded:', storagePath);
    return downloadURL;
  } catch (error) {
    console.warn('[Storage] Upload failed:', error.message);
    return null;
  }
};

/**
 * Delete a file from Firebase Storage.
 */
export const deleteFileFromStorage = async (storagePath) => {
  try {
    const storageRef = ref(storage, storagePath);
    await deleteObject(storageRef);
    console.log('[Storage] Deleted:', storagePath);
  } catch (error) {
    console.warn('[Storage] Delete failed:', error.message);
  }
};

/**
 * Process an array of note blocks — upload any image/pdf blocks
 * that still have local URIs. Returns a new blocks array with
 * remote download URLs (local blocks that fail to upload are kept as-is).
 *
 * Does NOT mutate the original blocks array.
 */
export const uploadNoteFileBlocks = async (userId, noteId, blocks) => {
  if (!blocks || blocks.length === 0) return blocks;

  const processed = await Promise.all(
    blocks.map(async (block) => {
      if (block.type !== 'image' && block.type !== 'pdf') return block;

      const localUri = block.metadata?.url;
      if (!localUri || !isLocalUri(localUri)) return block;

      const prefix = block.type === 'pdf' ? 'pdf' : 'img';
      const filename = generateFilename(localUri, prefix);
      const storagePath = getNoteFilePath(userId, noteId, filename);

      const downloadURL = await uploadFileToStorage(localUri, storagePath);
      if (!downloadURL) return block; // keep local URI on failure

      return {
        ...block,
        metadata: {
          ...block.metadata,
          url: downloadURL,
          storagePath,
        },
      };
    })
  );

  return processed;
};
