import { collection, addDoc, getDocs, doc, getDoc, query, where, orderBy, Timestamp } from "firebase/firestore";
import { db } from "./firebase";

export interface MainsQuestion {
  id?: string;
  topic: string;
  questionText: string;
  modelAnswer: string;
  language: "English" | "Hindi";
  createdAt: Date | any;
}

export async function addMainsQuestion(data: Omit<MainsQuestion, "id" | "createdAt">): Promise<string> {
  try {
    const docRef = await addDoc(collection(db, "mains_questions"), {
      ...data,
      createdAt: Timestamp.now()
    });
    return docRef.id;
  } catch (error) {
    console.error("Crash natively adding Mains Question:", error);
    throw error;
  }
}

export async function fetchMainsQuestions(language: "English" | "Hindi"): Promise<MainsQuestion[]> {
  try {
    const q = query(
      collection(db, "mains_questions"),
      where("language", "==", language)
      // Note: Omit orderBy locally to dynamically bypass complex index configuration crashes gracefully via local mapping.
    );
    const snap = await getDocs(q);
    
    const questions = snap.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as MainsQuestion[];
    
    // Natively sort descending matching Date variables safely
    return questions.sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis());
  } catch (error) {
    console.error("Crash executing Mains Question logic fetching:", error);
    return [];
  }
}

export async function fetchMainsQuestionById(id: string): Promise<MainsQuestion | null> {
  try {
    const docRef = doc(db, "mains_questions", id);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
       return { id: snap.id, ...snap.data() } as MainsQuestion;
    }
    return null;
  } catch (error) {
    console.error("Crash extracting individual question node:", error);
    return null;
  }
}
