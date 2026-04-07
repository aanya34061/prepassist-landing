import { db } from "./firebase";
import { collection, addDoc, getDocs, query, where, orderBy, serverTimestamp, Timestamp } from "firebase/firestore";

export interface RAGHistoryEntry {
   id?: string;
   userId: string;
   query: string;
   answer: string;
   createdAt?: any;
}

export const saveRagHistory = async (userId: string, queryText: string, answer: string): Promise<string> => {
   if (!userId) throw new Error("Authentication Required Native.");
   
   try {
      const docRef = await addDoc(collection(db, "users", userId, "rag_notes"), {
         userId,
         query: queryText,
         answer,
         createdAt: serverTimestamp()
      });
      return docRef.id;
   } catch (error) {
      console.error("[RAG History] Failed saving structural mapping globally:", error);
      throw error;
   }
};

export const fetchRagHistory = async (userId: string): Promise<RAGHistoryEntry[]> => {
   if (!userId) return [];
   
   try {
      const q = query(
         collection(db, "users", userId, "rag_notes"),
         orderBy("createdAt", "desc")
      );
      
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
         id: doc.id,
         ...doc.data()
      })) as RAGHistoryEntry[];
   } catch (error) {
      console.error("[RAG History] Failed fetching structured loops natively:", error);
      return [];
   }
};
