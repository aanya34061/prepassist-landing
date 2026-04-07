import { db } from "./firebase";
import { collection, addDoc, getDocs, query, orderBy, limit, serverTimestamp, where, writeBatch, doc } from "firebase/firestore";

export interface CurrentAffair {
  id?: string;
  title: string;
  source: string;
  content: string;
  tags: string[];
  publishDate: string;
  createdAt?: any;
}

export const addCurrentAffair = async (affair: Omit<CurrentAffair, 'id' | 'createdAt'>) => {
  try {
    const formattedTags = (affair.tags || []).map(t => t.toLowerCase().trim());
    const docRef = await addDoc(collection(db, "current_affairs"), {
      ...affair,
      tags: formattedTags,
      publishDate: affair.publishDate, // Enforce Calendar Date linking
      createdAt: serverTimestamp()
    });
    return docRef.id;
  } catch (error) {
    console.error("Error pushing Current Affair to DB:", error);
    throw error;
  }
};

export const bulkAddCurrentAffairs = async (affairs: Omit<CurrentAffair, 'id' | 'createdAt'>[]) => {
  try {
    const batch = writeBatch(db);
    const colRef = collection(db, "current_affairs");
    
    affairs.forEach(affair => {
      const formattedTags = (affair.tags || []).map(t => t.toLowerCase().trim());
      batch.set(doc(colRef), {
        title: affair.title || "Untitled UPSC Extraction",
        content: affair.content || "",
        source: affair.source || "Unknown Publication",
        tags: formattedTags,
        publishDate: affair.publishDate,
        createdAt: serverTimestamp()
      });
    });
    
    // Forcefully timeout Firebase if Websockets are blocked
    const commitPromise = batch.commit();
    const timeoutPromise = new Promise((_, reject) => {
       setTimeout(() => reject(new Error("FIREBASE TIMEOUT: The connection to Google Firestore was forcefully dropped. Ensure you are connected to the network and your AdBlockers/Firewalls are not blocking Firebase WebSockets.")), 8000);
    });
    
    await Promise.race([commitPromise, timeoutPromise]);
  } catch (error) {
    console.error("Error pushing batch Current Affairs to DB:", error);
    throw error;
  }
};

export const fetchRecentCurrentAffairs = async (maxResults: number = 10) => {
  try {
    const q = query(collection(db, "current_affairs"), orderBy("createdAt", "desc"), limit(maxResults));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CurrentAffair));
  } catch (error) {
    console.error("Error fetching Current Affairs:", error);
    return [];
  }
};

export const fetchAffairsByDate = async (dateStr: string): Promise<CurrentAffair[]> => {
  try {
    const q = query(
      collection(db, "current_affairs"),
      where("publishDate", "==", dateStr)
    );
    const querySnapshot = await getDocs(q);
    const affairs: CurrentAffair[] = [];
    querySnapshot.forEach((doc) => {
      affairs.push({ id: doc.id, ...doc.data() } as CurrentAffair);
    });
    
    // In-memory sort bypasses complex Firebase indexing constraints
    return affairs.sort((a, b) => b.createdAt?.seconds - a.createdAt?.seconds);
  } catch (error) {
    console.error("Error fetching affairs by date: ", error);
    return [];
  }
};
