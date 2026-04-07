import { NextResponse } from 'next/server';
import { generateUPSCIdentity } from '@/lib/ai/google-embeddings';
import { supabase } from '@/lib/supabase';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

export async function POST(req: Request) {
   try {
      const authHeader = req.headers.get("Authorization");
      const token = authHeader?.split(" ")[1];
      
      if (!token) return NextResponse.json({ error: "Missing Security Token" }, { status: 401 });

      const { data: { user } } = await supabase.auth.getUser(token);
      if (!user) return NextResponse.json({ error: "Unauthenticated Node." }, { status: 401 });

      const userDoc = await getDoc(doc(db, "users", user.id));
      if (!userDoc.exists() || userDoc.data().role !== "admin") {
          return NextResponse.json({ error: "Insufficient Matrix Clearance." }, { status: 403 });
      }

      const { text, subject } = await req.json();

      if (!text || !subject || text.length < 20) {
         return NextResponse.json({ error: "Missing Target Text or Subject Array (Requires 20+ chars)." }, { status: 400 });
      }

      // Automatically construct the Native 768-Dimensional Vector
      const vector = await generateUPSCIdentity(text);

      // Push securely to the Supabase Global Postgres Vector Table
      const { error } = await supabase.from('reference_materials').insert({
         content: text,
         subject: subject.toLowerCase(),
         embedding: vector 
      });

      if (error) {
         console.error("Supabase Database Blocked the transaction:", error);
         return NextResponse.json({ error: `Supabase Core Rejection: ${error.message}` }, { status: 500 });
      }

      return NextResponse.json({ success: true, message: "Text Matrix Successfully Appended to Global Memory Array." });

   } catch (error: any) {
      console.error("Admin Vectorization System Error:", error);
      return NextResponse.json({ error: `Internal Vectorization Panic: ${error.message}` }, { status: 500 });
   }
}
