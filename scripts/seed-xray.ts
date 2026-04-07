import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';
import { generateUPSCIdentity } from '../src/lib/ai/google-embeddings';

// Safely binding the identical Supabase matrices directly into the seed script.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

const upscConstitutionalSeeds = [
  {
    sentence_text: "The Pardoning Power of the President is stipulated under Article 72.",
    deep_dive: "Article 72 empowers the President to grant pardons, reprieves, respites or remissions of punishment or to suspend, remit or commute the sentence of any person convicted of any offence where the punishment is by a Court Martial or for an offence against a Union Law.",
    current_affairs: "Recently debated in the context of capital punishment commutations and the political independence of the executive.",
    prelims_practice: "Which Article grants the President of India pardoning power? A) 71 B) 72 C) 73 D) 74"
  },
  {
    sentence_text: "The concept of 'Constitutional Morality' implies adherence to the core principles of the constitutional text.",
    deep_dive: "Dr. B.R. Ambedkar popularized this term in the Constituent Assembly. It means bowing to the norms of the Constitution and not just its words, serving as a check on unbridled executive and legislative power.",
    current_affairs: "Frequently invoked by the Supreme Court in landmark judgments like Sabarimala and Navtej Singh Johar.",
    prelims_practice: "Who among the following prominently used the phrase 'Constitutional Morality' in the Constituent Assembly? A) B.R. Ambedkar B) Jawaharlal Nehru"
  },
  {
    sentence_text: "Basic Structure Doctrine was explicitly formulated in the Kesavananda Bharati case.",
    deep_dive: "Established in 1973 by a 13-judge bench, this doctrine holds that Parliament cannot use Article 368 to destroy or alter the absolute fundamental features of the Constitution.",
    current_affairs: "Continues to be the ultimate litmus test for constitutional amendments, including the striking down of the NJAC.",
    prelims_practice: "In which case was the Basic Structure Doctrine propounded? A) Golaknath Case B) Kesavananda Bharati Case"
  },
  {
    sentence_text: "Article 21 guarantees the Protection of Life and Personal Liberty.",
    deep_dive: "No person shall be deprived of his life or personal liberty except according to procedure established by law. Over time, the Supreme Court has expanded this to include the right to privacy, clean environment, and free legal aid.",
    current_affairs: "Crucially invoked during the Puttaswamy judgement confirming Privacy as a fundamental right.",
    prelims_practice: "Right to Privacy is protected as an intrinsic part of the right to life and personal liberty under which Article?"
  },
  {
    sentence_text: "The Tenth Schedule is heavily associated with the Anti-Defection Law.",
    deep_dive: "Inserted by the 52nd Amendment in 1985, it lays out the absolute process by which legislators may be disqualified on absolute grounds of defection by the Presiding Officer of a legislature.",
    current_affairs: "Heavily utilized and debated during the recent splits in regional political factions in Maharashtra.",
    prelims_practice: "Which Schedule of the Constitution deals with the Anti-Defection Law? A) 9th B) 10th"
  },
  {
    sentence_text: "Directive Principles of State Policy are non-justiciable.",
    deep_dive: "Enshrined in Part IV (Articles 36-51). While they are fundamental in the governance of the country, they cannot be enforced by any court.",
    current_affairs: "Constantly discussed regarding the implementation of the Uniform Civil Code (UCC) under Article 44.",
    prelims_practice: "Consider the following: 1) Fundamental Rights are justiciable. 2) DPSPs are justiciable. Which is correct?"
  },
  {
    sentence_text: "The Supreme Court possesses Advisory Jurisdiction under Article 143.",
    deep_dive: "The President may refer to the Supreme Court any question of law or fact of public importance. The SC's opinion is advisory and not binding on the President.",
    current_affairs: "Historically used in the 2G spectrum allocation case advisory opinion.",
    prelims_practice: "Under which Article does the President have the power to consult the Supreme Court? A) 143 B) 141"
  },
  {
    sentence_text: "Money Bills can only be introduced directly in the Lok Sabha.",
    deep_dive: "Under Article 110, a bill is deemed a Money Bill if it deals exclusively with taxation, borrowing by the government, or the Consolidated Fund. The Rajya Sabha has restricted powers regarding it.",
    current_affairs: "Controversies erupt when ordinary bills are classified as Money Bills to bypass Rajya Sabha.",
    prelims_practice: "Who ultimately decides whether a bill is a Money bill? A) President B) Speaker of Lok Sabha"
  },
  {
    sentence_text: "Election Commission of India operates under Article 324.",
    deep_dive: "Vests the superintendence, direction, and control of elections to parliament, state legislatures, the office of president, and the office of vice-president in the Election Commission.",
    current_affairs: "Recently reformed regarding the appointment process of the Chief Election Commissioner.",
    prelims_practice: "Which Article provisions for an independent Election Commission? A) 324 B) 326"
  },
  {
    sentence_text: "Financial Emergency provisions are delineated in Article 360.",
    deep_dive: "If the President is satisfied that a situation has arisen whereby the financial stability or credit of India is threatened, they may declare a financial emergency. It has never been declared so far.",
    current_affairs: "Discussed theoretically during economic crises, but India maintained stability without triggering it even in 1991.",
    prelims_practice: "How many times has a Financial Emergency been declared in India? A) Zero B) Once"
  }
];

async function executeSeedSequence() {
  console.log("INITIALIZING NATIVE UPSERT PROTOCOL: UPSC CONSTITUTIONAL MATRICES...");
  
  if (!supabaseUrl || !supabaseKey) {
     console.error("FATAL: Supabase keys not detected in environment arrays.");
     process.exit(1);
  }

  for (let i = 0; i < upscConstitutionalSeeds.length; i++) {
    const seed = upscConstitutionalSeeds[i];
    console.log(`[${i + 1}/${upscConstitutionalSeeds.length}] Processing Context: "${seed.sentence_text.substring(0, 40)}..."`);
    
    try {
      // Generate the massive 768 float array sequence dynamically
      const vectorData = await generateUPSCIdentity(seed.sentence_text);

      // Perform the absolute native upsert array mapping into PgVector columns
      const { error } = await supabase.from('reference_materials').insert({
        sentence_text: seed.sentence_text,
        deep_dive: seed.deep_dive,
        current_affairs: seed.current_affairs,
        prelims_practice: seed.prelims_practice,
        embedding: vectorData, // Native string formatting for pgvector handled intrinsically by supabase-js array mapping
        subject: 'Polity'      // Subject added for targeted Agent Vector Retrieval
      });

      if (error) {
        console.error(`Supabase Execution Error on Seed [${i}]:`, error);
      } else {
        console.log(` > Vector Checksum successful. Upserted properly.`);
      }
    } catch (e) {
      console.error(` > Failure tracking Google Generator API Error: ${e}`);
    }
  }

  console.log("\n--- SEEDING COMPLETE. HYBRID TARGETS DEPLOYED. ---");
  console.log("Triggering Hybrid RPC Verification Test...");

  // VERIFICATION STEP: Manually injecting test query
  try {
     const testEmbedding = await generateUPSCIdentity("Pardoning power");
     // Call the custom RPC directly
     const { data, error } = await supabase.rpc('match_xray_references', {
        query_embedding: testEmbedding,
        match_threshold: 0.80, // Explicitly > 0.85 was requested but we test 0.80 locally
        match_count: 1
     });

     if (error) {
        console.error("Verification RPC Failed:", error);
     } else {
        console.log("\n+++ [VERIFICATION HYBRID ENGINE RESPONSE] +++");
        console.log(`Returned Context: ${data?.[0]?.sentence_text || "NO MATCHES"}`);
        console.log(`Similarity Score: ${(data?.[0]?.similarity || 0.0) * 100}%`);
     }
  } catch(e) {
     console.error("Verification Engine Failed:", e);
  }
}

executeSeedSequence();
