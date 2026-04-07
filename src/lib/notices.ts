import { collection, addDoc, getDocs, query, orderBy, limit, Timestamp } from "firebase/firestore";
import { db } from "./firebase";

export interface Notice {
  id?: string;
  message: string;
  isCritical: boolean;
  createdAt: Date | any;
}

export async function fetchNotices(maxResults = 5): Promise<Notice[]> {
  try {
    const q = query(
        collection(db, "notices"), 
        orderBy("createdAt", "desc"), 
        limit(maxResults)
    );
    const snap = await getDocs(q);
    
    return snap.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Notice[];
  } catch (error) {
    console.error("Crash during Notice fetch:", error);
    return [];
  }
}

export async function postNotice(message: string, isCritical: boolean): Promise<void> {
  try {
    await addDoc(collection(db, "notices"), {
      message,
      isCritical,
      createdAt: Timestamp.now()
    });
  } catch (error) {
    console.error("Crash during Notice post:", error);
    throw error;
  }
}
