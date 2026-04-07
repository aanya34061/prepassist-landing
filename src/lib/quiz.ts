import { db } from "./firebase";
import { collection, addDoc, getDocs, query, where, serverTimestamp } from "firebase/firestore";

export interface QuizResult {
  id?: string;
  userId: string;
  source?: string;
  totalQuestions: number;
  correctAnswers: number;
  wrongAnswers: number;
  accuracy: number;
  subjectAnalytics?: Record<string, { attempted: number; correct: number; wrong: number }>;
  timestamp?: any;
}

export const saveQuizResult = async (result: Omit<QuizResult, 'id' | 'timestamp'>) => {
  try {
    const docRef = await addDoc(collection(db, "quiz_results"), {
      ...result,
      timestamp: serverTimestamp()
    });
    return docRef.id;
  } catch (error) {
    console.error("Error saving QA metrics:", error);
    throw error;
  }
};

export const fetchUserProgress = async (userId: string = "guest_user"): Promise<QuizResult[]> => {
   try {
     const q = query(collection(db, "quiz_results"), where("userId", "==", userId));
     const snap = await getDocs(q);
     const results: QuizResult[] = [];
     snap.forEach(doc => results.push({ id: doc.id, ...doc.data() } as QuizResult));
     
     // In-memory bypass of composite indexing
     return results.sort((a,b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0));
   } catch(error) {
     console.error("Error fetching progress analytics:", error);
     return [];
   }
};
