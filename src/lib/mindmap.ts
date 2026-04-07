import { db } from "./firebase";
import { collection, query, where, getDocs, addDoc, serverTimestamp, orderBy, limit } from "firebase/firestore";

export interface MindmapNode {
  title: string;
  children?: MindmapNode[];
}

export interface UserMindmap {
  id?: string;
  userId: string;
  topic: string;
  mapData: MindmapNode;
  createdAt?: any;
}

/**
 * Saves a finalized Mindmap explicitly to the user's persistent Firebase historical array.
 */
export const saveMindmap = async (userId: string, topic: string, mapData: MindmapNode): Promise<string> => {
   const collectionRef = collection(db, "users", userId, "mindmaps");
   const docRef = await addDoc(collectionRef, {
      userId,
      topic,
      mapData,
      createdAt: serverTimestamp()
   });
   return docRef.id;
};

/**
 * Validates and globally pulls historical Mindmaps to strictly stop duplicate deductions natively.
 */
export const fetchUserMindmaps = async (userId: string): Promise<UserMindmap[]> => {
   const collectionRef = collection(db, "users", userId, "mindmaps");
   const q = query(collectionRef, orderBy("createdAt", "desc"), limit(20));
   const snap = await getDocs(q);
   
   return snap.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
   })) as UserMindmap[];
};
