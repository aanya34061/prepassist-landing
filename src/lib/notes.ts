import { db } from "./firebase";
import { collection, query, where, getDocs, doc, setDoc, serverTimestamp } from "firebase/firestore";

export const saveNoteToCloud = async (userId: string, topicName: string, markdownContent: string) => {
  try {
    // Escape invalid document characters safely
    const safeTopic = topicName.replace(/[\/\\?%*:|"<>]/g, '-');
    const docRef = doc(db, "rag_notes", `${userId}_${safeTopic}`);
    
    await setDoc(docRef, {
      userId,
      title: topicName,
      content: markdownContent,
      updatedAt: serverTimestamp()
    });
    
    return docRef.id;
  } catch (error) {
    console.error("Error saving note to Firestore vault:", error);
    throw error;
  }
};

export const fetchUserNotes = async (userId: string) => {
  try {
    const q = query(collection(db, "rag_notes"), where("userId", "==", userId));
    const snap = await getDocs(q);
    const results: any[] = [];
    
    snap.forEach(d => {
       const data = d.data();
       // Return explicitly structured payload natively skipping Storage URL resolution
       results.push({ name: data.title + ".md", content: data.content, id: d.id });
    });
    
    return results;
  } catch (error) {
    console.error("Error fetching notes from Firestore vault:", error);
    throw error;
  }
};
