import { db } from "./firebase";
import { collection, addDoc, getDocs, query, limit, Timestamp, writeBatch, doc, where } from "firebase/firestore";

export interface Question {
  id?: string;
  language?: 'English' | 'Hindi'; // Explicit Language tracking strictly enforced
  question: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctAnswer: 'A' | 'B' | 'C' | 'D';
  explanation: string;
  createdAt?: Date | any;
}

export async function addQuestion(data: Omit<Question, 'id' | 'createdAt'>) {
  const docRef = await addDoc(collection(db, "question_bank"), {
    ...data,
    createdAt: Timestamp.now()
  });
  return docRef.id;
}

export async function bulkAddQuestions(questions: Omit<Question, 'id' | 'createdAt'>[]) {
  const batch = writeBatch(db);
  const colRef = collection(db, "question_bank");
  
  questions.forEach(q => {
    const docRef = doc(colRef);
    batch.set(docRef, { ...q, createdAt: Timestamp.now() });
  });

  await batch.commit();
}

export async function fetchQuestions(maxResults = 50, language = 'English'): Promise<Question[]> {
  // Broad query natively catching legacy documents lacking the 'language' field
  const q = query(
     collection(db, "question_bank"), 
     limit(maxResults * 3) // overfetch to ensure filter saturation
  );
  
  const snap = await getDocs(q);
  
  let results = snap.docs.map(doc => ({
    id: doc.id,
    ...(doc.data() as Omit<Question, 'id'>)
  }));

  // Safely map legacy missing-language questions strictly to English natively
  results = results.filter(q => {
     const docLang = q.language || 'English';
     return docLang === language;
  });

  // Shrink back to max limit and randomize locally
  results = results.slice(0, maxResults).sort(() => Math.random() - 0.5);

  return results;
}
