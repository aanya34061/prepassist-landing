import { db } from "./firebase";
import { doc, getDoc, setDoc, updateDoc, increment, serverTimestamp, onSnapshot, collection, addDoc, getDocs, query, orderBy } from "firebase/firestore";

export interface UserSubscriptionProfile {
  userId: string;
  email?: string;
  credits: number;
  tier: 'free' | 'pro' | 'ultimate';
  hasCloudNotes?: boolean;
  createdAt?: any;
}

/**
 * Initializes or fetches a user's credit profile from Firestore.
 * Automatically provisions 10 Free Credits for new users.
 */
export const fetchUserProfile = async (userId: string, email?: string, referralPayload?: string | null): Promise<UserSubscriptionProfile> => {
   if (!userId) throw new Error("No User ID provided.");
   
   const userRef = doc(db, "users", userId);
   const snap = await getDoc(userRef);
   
   if (snap.exists()) {
      return snap.data() as UserSubscriptionProfile;
   } else {
      // First-time signup initialization
      let initialCredits = 10;
      
      // Execute 20/20 Referral Bonus execution arrays gracefully
      if (referralPayload && referralPayload !== userId) {
         try {
            initialCredits = 30; // 10 Base + 20 Bonus for Invitee
            
            // Simultaneously distribute +20 dynamically to Inviter Ledger
            const inviterRef = doc(db, "users", referralPayload);
            const inviterSnap = await getDoc(inviterRef);
            
            if (inviterSnap.exists()) {
               await updateDoc(inviterRef, {
                  credits: increment(20)
               });
               
               await addDoc(collection(db, "users", referralPayload, "credit_usage"), {
                  userId: referralPayload,
                  cost: -20, // Negative cost implies Ledger Addition globally
                  featureName: `Referral Program Reward (Invited ${email || userId})`,
                  createdAt: serverTimestamp()
               });
            }
         } catch(e) {
            console.error("Referral validation block failed, defaulting safely.", e);
            initialCredits = 10;
         }
      }

      const newProfile: UserSubscriptionProfile = {
         userId,
         email: email || "",
         credits: initialCredits,
         tier: 'free',
         hasCloudNotes: false,
         createdAt: serverTimestamp()
      };
      await setDoc(userRef, newProfile);
      
      if (initialCredits > 10) {
         // Log the signup bonus natively for Invitee
         await addDoc(collection(db, "users", userId, "credit_usage"), {
            userId,
            cost: -20,
            featureName: "Referral Sandbox Signup Bonus",
            createdAt: serverTimestamp()
         });
      }
      
      return newProfile;
   }
};

/**
 * Persistently unlocks the User Cloud Vault mapping to allow indefinite Firebase Blob processing.
 */
export const unlockCloudVault = async (userId: string): Promise<void> => {
   if (!userId) throw new Error("No User ID");
   const ref = doc(db, "users", userId);
   await updateDoc(ref, {
      hasCloudNotes: true
   });
};

/**
 * Mathematically deducts explicitly mapped AI Credits per action.
 * Throws 'Insufficient Credits' error if balance drops below 0 natively preventing Cloud execution.
 * Simultaneously generates a physical expenditure receipt.
 */
export const deductCredit = async (userId: string, cost: number, featureName: string = "Core API Generation"): Promise<void> => {
   const userRef = doc(db, "users", userId);
   const snap = await getDoc(userRef);
   
   if (!snap.exists()) {
      throw new Error("Credit Profile missing. Please reload the dashboard.");
   }
   
   const currentCredits = snap.data().credits;
   if (currentCredits < cost) {
      throw new Error("INSUFFICIENT_CREDITS");
   }

   // Deduct atomically 
   await updateDoc(userRef, {
      credits: increment(-cost)
   });
   
   // Emit absolute persistent telemetry receipt
   try {
       await addDoc(collection(db, "users", userId, "credit_usage"), {
          userId,
          cost,
          featureName,
          createdAt: serverTimestamp()
       });
   } catch(e) {
       console.error("[Telemetry Fault] Core usage mapping failed.", e);
   }
};

/**
 * Recharges specific Credit amounts to the ledger dynamically.
 */
export const addCredits = async (userId: string, amount: number): Promise<void> => {
   const userRef = doc(db, "users", userId);
   await updateDoc(userRef, {
      credits: increment(amount)
   });
};

/**
 * Upgrades the subscription tier natively.
 */
export const upgradeTier = async (userId: string, tier: 'free'|'pro'|'ultimate'): Promise<void> => {
   const userRef = doc(db, "users", userId);
   await updateDoc(userRef, { tier });
};

// --- Native Ledger System Extensions ---

export interface TransactionRecord {
   id?: string;
   userId: string;
   amount: number;     // AI Credits injected
   costINR: number;    // Absolute Cost globally mapped in INR
   planName: string;   // Identifier (e.g., Target 50 Pack)
   status: 'Success' | 'Failed' | 'Pending';
   createdAt?: any;
}

/**
 * Commits a physical transaction receipt directly to the Ledger natively.
 */
export const logTransaction = async (userId: string, amount: number, costINR: number, planName: string, status: 'Success'|'Failed'|'Pending' = 'Success') => {
   if (!userId) return;
   try {
      await addDoc(collection(db, "users", userId, "transactions"), {
         userId,
         amount,
         costINR,
         planName,
         status,
         createdAt: serverTimestamp()
      });
   } catch(e) {
      console.error("[Native Ledger Fault] Transactions array dropped.", e);
   }
};

/**
 * Extracts and maps all transaction records for the Ledger explicitly ordered chronologically.
 */
export const fetchTransactionHistory = async (userId: string): Promise<TransactionRecord[]> => {
   if (!userId) return [];
   try {
      const q = query(collection(db, "users", userId, "transactions"), orderBy("createdAt", "desc"));
      const snap = await getDocs(q);
      return snap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as TransactionRecord[];
   } catch(e) {
      console.error("[Native Ledger Fault] Retrieval arrays corrupted.", e);
      return [];
   }
};

// --- Expenditure Telemetry Interfaces ---

export interface CreditUsageRecord {
   id?: string;
   userId: string;
   cost: number;
   featureName: string;
   createdAt?: any;
}

/**
 * Extracts chronological matrices locating explicit AI expenditure burns mapped to individual triggers.
 */
export const fetchCreditUsageHistory = async (userId: string): Promise<CreditUsageRecord[]> => {
   if (!userId) return [];
   try {
      const q = query(collection(db, "users", userId, "credit_usage"), orderBy("createdAt", "desc"));
      const snap = await getDocs(q);
      return snap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as CreditUsageRecord[];
   } catch(e) {
      console.error("[Telemetry Fault] Usage arrays dropped.", e);
      return [];
   }
};
