import { collection, addDoc, getDocs, query, where, orderBy, limit, Timestamp } from "firebase/firestore";
import { db } from "./firebase";

export interface Flashcard {
  id?: string;
  topic: string;
  frontText: string;
  backText: string;
  language: "English" | "Hindi";
  createdAt: Date | any;
}

export async function addFlashcard(data: Omit<Flashcard, "id" | "createdAt">): Promise<string> {
  try {
    const docRef = await addDoc(collection(db, "flashcards"), {
      ...data,
      createdAt: Timestamp.now()
    });
    return docRef.id;
  } catch (error) {
    console.error("Crash natively adding Flashcard:", error);
    throw error;
  }
}

export async function fetchFlashcards(language: "English" | "Hindi", limitCount: number = 10): Promise<Flashcard[]> {
  try {
    const q = query(
      collection(db, "flashcards"),
      where("language", "==", language)
      // Omit orderBy to strictly match index avoidance; we sort natively right after
    );
    const snap = await getDocs(q);
    
    let cards = snap.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Flashcard[];
    
    // Sort descending internally for maximum stability
    cards.sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis());
    
    return cards.slice(0, limitCount);
  } catch (error) {
    console.error("Crash executing Flashcard fetching:", error);
    return [];
  }
}
