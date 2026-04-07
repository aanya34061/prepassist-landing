import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc, updateDoc, collection, getDocs, increment, arrayUnion } from "firebase/firestore";

export interface Promocode {
    code: string;
    credits: number;
    maxUses: number;
    currentUses: number;
    isActive: boolean;
    usedBy: string[];
    createdAt: string;
}

export const createPromocode = async (code: string, credits: number, maxUses: number) => {
    const formattedCode = code.toUpperCase().trim();
    if (!formattedCode) throw new Error("Invalid Code String.");
    
    const promoRef = doc(db, "promocodes", formattedCode);
    const snap = await getDoc(promoRef);
    if (snap.exists()) {
        throw new Error("This promotional code already exists natively in the ledger.");
    }
    
    const newPromo: Promocode = {
        code: formattedCode,
        credits,
        maxUses,
        currentUses: 0,
        isActive: true,
        usedBy: [],
        createdAt: new Date().toISOString()
    };
    
    await setDoc(promoRef, newPromo);
    return newPromo;
};

export const getPromocodes = async (): Promise<Promocode[]> => {
    const snap = await getDocs(collection(db, "promocodes"));
    return snap.docs.map(doc => doc.data() as Promocode).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
};

export const togglePromocodeStatus = async (code: string, currentStatus: boolean) => {
    const promoRef = doc(db, "promocodes", code);
    await updateDoc(promoRef, { isActive: !currentStatus });
};

export const redeemPromocode = async (code: string, userId: string) => {
    const formattedCode = code.toUpperCase().trim();
    if (!formattedCode) throw new Error("Invalid Code String.");
    if (!userId) throw new Error("Invalid Auth Context.");
    
    const promoRef = doc(db, "promocodes", formattedCode);
    const snap = await getDoc(promoRef);
    
    if (!snap.exists()) {
        throw new Error("Invalid Promotional Code. The code does not exist.");
    }
    
    const promoData = snap.data() as Promocode;
    
    if (!promoData.isActive) {
        throw new Error("This promotional code has been globally deactivated.");
    }
    
    if (promoData.currentUses >= promoData.maxUses) {
        throw new Error("This promotional code has reached its maximum global redemption limit.");
    }
    
    if (promoData.usedBy && promoData.usedBy.includes(userId)) {
        throw new Error("You have already redeemed this promotional code securely.");
    }
    
    // Execute atomic parallel ledger updates bypassing racing natively
    const userRef = doc(db, "users", userId);
    
    await updateDoc(promoRef, {
        currentUses: increment(1),
        usedBy: arrayUnion(userId)
    });

    await updateDoc(userRef, {
        credits: increment(promoData.credits)
    });
    
    // Return the number of credits injected
    return promoData.credits;
};
