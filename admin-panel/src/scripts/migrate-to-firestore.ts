/**
 * One-time migration script: Supabase PostgreSQL → Firestore
 *
 * Usage:
 *   npx ts-node --compiler-options '{"module":"commonjs"}' src/scripts/migrate-to-firestore.ts
 *
 * Prerequisites:
 *   - FIREBASE_SERVICE_ACCOUNT_KEY set in .env.local
 *   - DATABASE_URL set in .env.local (Supabase Postgres)
 *
 * This script migrates all data from Supabase tables to Firestore collections.
 * It is idempotent — re-running will overwrite existing docs with same IDs.
 */

import 'dotenv/config';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import postgres from 'postgres';

// ─── Firebase Admin Init ────────────────────────────────────
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY || '{}');
const app = initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore(app);

// ─── Postgres Init ──────────────────────────────────────────
const sql = postgres(process.env.DATABASE_URL!, { ssl: { rejectUnauthorized: false } });

// ─── Helpers ────────────────────────────────────────────────
function ts(d: Date | string | null): FirebaseFirestore.Timestamp | null {
  if (!d) return null;
  const date = typeof d === 'string' ? new Date(d) : d;
  return FirebaseFirestore.Timestamp.fromDate(date);
}

async function batchWrite(
  collectionName: string,
  docs: { id?: string; data: Record<string, any> }[],
) {
  const BATCH_SIZE = 400; // Firestore limit is 500, keep margin
  let count = 0;

  for (let i = 0; i < docs.length; i += BATCH_SIZE) {
    const batch = db.batch();
    const chunk = docs.slice(i, i + BATCH_SIZE);

    for (const doc of chunk) {
      const ref = doc.id
        ? db.collection(collectionName).doc(doc.id)
        : db.collection(collectionName).doc();
      batch.set(ref, doc.data, { merge: true });
    }

    await batch.commit();
    count += chunk.length;
    console.log(`  ${collectionName}: ${count}/${docs.length}`);
  }

  return count;
}

// ─── Migration Functions ────────────────────────────────────

async function migrateUsers() {
  console.log('\n=== Migrating users ===');
  const rows = await sql`SELECT * FROM users ORDER BY id`;
  const docs = rows.map((r) => ({
    id: String(r.id),
    data: {
      email: r.email,
      name: r.name,
      phone: r.phone || null,
      picture: r.picture || null,
      provider: r.provider,
      role: r.role,
      isGuest: r.is_guest || false,
      isActive: r.is_active !== false,
      lastLogin: ts(r.last_login),
      createdAt: ts(r.created_at) || FieldValue.serverTimestamp(),
      updatedAt: ts(r.updated_at) || FieldValue.serverTimestamp(),
      legacyId: r.id, // Keep old integer ID for reference
    },
  }));
  return batchWrite('users', docs);
}

async function migrateAdminUsers() {
  console.log('\n=== Migrating admin_users ===');
  const rows = await sql`SELECT * FROM admin_users ORDER BY id`;
  const docs = rows.map((r) => ({
    id: String(r.id),
    data: {
      email: r.email,
      password: r.password, // bcrypt hash
      name: r.name,
      role: r.role,
      createdAt: ts(r.created_at) || FieldValue.serverTimestamp(),
    },
  }));
  return batchWrite('admin_users', docs);
}

async function migrateArticles() {
  console.log('\n=== Migrating articles ===');
  const rows = await sql`SELECT * FROM articles ORDER BY id`;
  const docs = rows.map((r) => ({
    id: String(r.id),
    data: {
      title: r.title,
      author: r.author || null,
      sourceUrl: r.source_url || null,
      publishedDate: ts(r.published_date),
      summary: r.summary || null,
      metaDescription: r.meta_description || null,
      content: r.content || [],
      rawHtml: r.raw_html || null,
      images: r.images || [],
      gsPaper: r.gs_paper || null,
      subject: r.subject || null,
      tags: r.tags || [],
      isPublished: r.is_published || false,
      scrapedAt: ts(r.scraped_at),
      createdAt: ts(r.created_at) || FieldValue.serverTimestamp(),
      updatedAt: ts(r.updated_at) || FieldValue.serverTimestamp(),
      legacyId: r.id,
    },
  }));
  return batchWrite('articles', docs);
}

async function migrateArticleMcqs() {
  console.log('\n=== Migrating article MCQs (as subcollections) ===');
  const rows = await sql`SELECT * FROM article_mcqs ORDER BY article_id, id`;
  let count = 0;

  // Group by article
  const byArticle: Record<number, any[]> = {};
  for (const r of rows) {
    if (!byArticle[r.article_id]) byArticle[r.article_id] = [];
    byArticle[r.article_id].push(r);
  }

  for (const [articleId, mcqs] of Object.entries(byArticle)) {
    const batch = db.batch();
    for (const r of mcqs) {
      const ref = db.collection('articles').doc(String(articleId)).collection('mcqs').doc(String(r.id));
      batch.set(ref, {
        question: r.question,
        optionA: r.option_a,
        optionB: r.option_b,
        optionC: r.option_c,
        optionD: r.option_d,
        correctAnswer: r.correct_answer,
        explanation: r.explanation || null,
        createdAt: ts(r.created_at) || FieldValue.serverTimestamp(),
        updatedAt: ts(r.updated_at) || FieldValue.serverTimestamp(),
      });
      count++;
    }
    await batch.commit();
  }

  console.log(`  article_mcqs: ${count} total`);
  return count;
}

async function migrateMaps() {
  console.log('\n=== Migrating maps ===');
  const rows = await sql`SELECT * FROM maps ORDER BY id`;
  const docs = rows.map((r) => ({
    id: String(r.id),
    data: {
      title: r.title,
      description: r.description || null,
      category: r.category,
      imageUrl: r.image_url,
      imagePath: r.image_path || null,
      tags: r.tags || [],
      additionalInfo: r.additional_info || null,
      hotspots: r.hotspots || null,
      isPublished: r.is_published !== false,
      createdAt: ts(r.created_at) || FieldValue.serverTimestamp(),
      updatedAt: ts(r.updated_at) || FieldValue.serverTimestamp(),
      legacyId: r.id,
    },
  }));
  return batchWrite('maps', docs);
}

async function migrateQuestionSets() {
  console.log('\n=== Migrating question_sets ===');
  const rows = await sql`SELECT * FROM question_sets ORDER BY id`;
  const docs = rows.map((r) => ({
    id: String(r.id),
    data: {
      title: r.title,
      description: r.description || null,
      year: r.year || null,
      isPublished: r.is_published || false,
      publishedDate: ts(r.published_date),
      createdAt: ts(r.created_at) || FieldValue.serverTimestamp(),
      updatedAt: ts(r.updated_at) || FieldValue.serverTimestamp(),
      legacyId: r.id,
    },
  }));
  return batchWrite('question_sets', docs);
}

async function migratePracticeQuestions() {
  console.log('\n=== Migrating practice_questions (as subcollections) ===');
  const rows = await sql`SELECT * FROM practice_questions ORDER BY question_set_id, id`;
  let count = 0;

  const bySet: Record<number, any[]> = {};
  for (const r of rows) {
    if (!r.question_set_id) continue;
    if (!bySet[r.question_set_id]) bySet[r.question_set_id] = [];
    bySet[r.question_set_id].push(r);
  }

  for (const [setId, questions] of Object.entries(bySet)) {
    const BATCH_SIZE = 400;
    for (let i = 0; i < questions.length; i += BATCH_SIZE) {
      const batch = db.batch();
      const chunk = questions.slice(i, i + BATCH_SIZE);
      for (const r of chunk) {
        const ref = db.collection('question_sets').doc(String(setId)).collection('questions').doc(String(r.id));
        batch.set(ref, {
          question: r.question,
          optionA: r.option_a,
          optionB: r.option_b,
          optionC: r.option_c,
          optionD: r.option_d,
          correctAnswer: r.correct_answer,
          explanation: r.explanation || '',
          createdAt: ts(r.created_at) || FieldValue.serverTimestamp(),
          updatedAt: ts(r.updated_at) || FieldValue.serverTimestamp(),
        });
        count++;
      }
      await batch.commit();
    }
  }

  console.log(`  practice_questions: ${count} total`);
  return count;
}

async function migrateRoadmap() {
  console.log('\n=== Migrating roadmap_topics ===');
  const topics = await sql`SELECT * FROM roadmap_topics ORDER BY id`;
  const topicDocs = topics.map((r) => ({
    id: String(r.id),
    data: {
      topicId: r.topic_id,
      name: r.name,
      paper: r.paper,
      icon: r.icon || null,
      estimatedHours: r.estimated_hours,
      difficulty: r.difficulty,
      priority: r.priority,
      isRecurring: r.is_recurring || false,
      optional: r.optional || null,
      createdAt: ts(r.created_at) || FieldValue.serverTimestamp(),
      updatedAt: ts(r.updated_at) || FieldValue.serverTimestamp(),
      legacyId: r.id,
    },
  }));
  await batchWrite('roadmap_topics', topicDocs);

  // Subtopics as subcollections
  console.log('  Migrating subtopics...');
  const subtopics = await sql`SELECT * FROM roadmap_subtopics ORDER BY topic_id, "order"`;
  let subCount = 0;
  const subByTopic: Record<number, any[]> = {};
  for (const r of subtopics) {
    if (!subByTopic[r.topic_id]) subByTopic[r.topic_id] = [];
    subByTopic[r.topic_id].push(r);
  }

  for (const [topicId, subs] of Object.entries(subByTopic)) {
    const batch = db.batch();
    for (const r of subs) {
      const ref = db.collection('roadmap_topics').doc(String(topicId)).collection('subtopics').doc(String(r.id));
      batch.set(ref, {
        subtopicId: r.subtopic_id,
        name: r.name,
        estimatedHours: r.estimated_hours,
        order: r.order,
      });
      subCount++;
    }
    await batch.commit();
  }
  console.log(`  subtopics: ${subCount} total`);

  // Sources as subcollections
  console.log('  Migrating sources...');
  const sources = await sql`SELECT * FROM roadmap_sources ORDER BY topic_id, "order"`;
  let srcCount = 0;
  const srcByTopic: Record<number, any[]> = {};
  for (const r of sources) {
    if (!srcByTopic[r.topic_id]) srcByTopic[r.topic_id] = [];
    srcByTopic[r.topic_id].push(r);
  }

  for (const [topicId, srcs] of Object.entries(srcByTopic)) {
    const batch = db.batch();
    for (const r of srcs) {
      const ref = db.collection('roadmap_topics').doc(String(topicId)).collection('sources').doc(String(r.id));
      batch.set(ref, {
        type: r.type,
        name: r.name,
        link: r.link || null,
        order: r.order,
      });
      srcCount++;
    }
    await batch.commit();
  }
  console.log(`  sources: ${srcCount} total`);
}

async function migrateVisualReferences() {
  console.log('\n=== Migrating visual_references ===');
  const rows = await sql`SELECT * FROM visual_references ORDER BY id`;
  const docs = rows.map((r) => ({
    id: String(r.id),
    data: {
      category: r.category,
      subcategory: r.subcategory || null,
      title: r.title,
      data: r.data,
      order: r.order,
      createdAt: ts(r.created_at) || FieldValue.serverTimestamp(),
      updatedAt: ts(r.updated_at) || FieldValue.serverTimestamp(),
      legacyId: r.id,
    },
  }));
  return batchWrite('visual_references', docs);
}

async function migrateHistoryTimeline() {
  console.log('\n=== Migrating history_timeline_events ===');
  const rows = await sql`SELECT * FROM history_timeline_events ORDER BY "order"`;
  const docs = rows.map((r) => ({
    id: String(r.id),
    data: {
      year: r.year,
      event: r.event,
      category: r.category,
      details: r.details || null,
      order: r.order,
      createdAt: ts(r.created_at) || FieldValue.serverTimestamp(),
      updatedAt: ts(r.updated_at) || FieldValue.serverTimestamp(),
      legacyId: r.id,
    },
  }));
  return batchWrite('history_timeline_events', docs);
}

async function migrateNotes() {
  console.log('\n=== Migrating notes ===');
  const rows = await sql`SELECT * FROM notes ORDER BY id`;

  // Get note_tags for denormalization
  const noteTagRows = await sql`
    SELECT nt.note_id, t.name, t.id as tag_id
    FROM note_tags nt
    JOIN tags t ON nt.tag_id = t.id
    ORDER BY nt.note_id
  `;

  const tagsByNote: Record<number, { names: string[]; ids: string[] }> = {};
  for (const r of noteTagRows) {
    if (!tagsByNote[r.note_id]) tagsByNote[r.note_id] = { names: [], ids: [] };
    tagsByNote[r.note_id].names.push(r.name);
    tagsByNote[r.note_id].ids.push(String(r.tag_id));
  }

  // Build searchTokens from title + plainText
  function buildSearchTokens(title: string, plainText: string | null): string[] {
    const text = `${title} ${plainText || ''}`.toLowerCase();
    const words = text.split(/\s+/).filter((w) => w.length > 2);
    return [...new Set(words)].slice(0, 100); // Cap at 100 tokens
  }

  // Get user id → email mapping for userId field
  const userRows = await sql`SELECT id, email FROM users`;
  const userMap: Record<number, string> = {};
  for (const u of userRows) userMap[u.id] = u.email;

  const docs = rows.map((r) => {
    const noteTags = tagsByNote[r.id] || { names: [], ids: [] };
    return {
      id: String(r.id),
      data: {
        userId: r.user_id ? String(r.user_id) : null, // Will be updated to Firebase UID after auth migration
        userEmail: r.user_id ? userMap[r.user_id] || null : null,
        title: r.title,
        content: r.content || null,
        plainText: r.plain_text || null,
        folderId: r.folder_id || null,
        backlinks: r.backlinks || [],
        linkedMindMapNodes: r.linked_mind_map_nodes || [],
        isPinned: r.is_pinned || false,
        isArchived: r.is_archived || false,
        tags: noteTags.names,
        tagIds: noteTags.ids,
        searchTokens: buildSearchTokens(r.title, r.plain_text),
        createdAt: ts(r.created_at) || FieldValue.serverTimestamp(),
        updatedAt: ts(r.updated_at) || FieldValue.serverTimestamp(),
        legacyId: r.id,
      },
    };
  });
  return batchWrite('notes', docs);
}

async function migrateTags() {
  console.log('\n=== Migrating tags ===');
  const rows = await sql`SELECT * FROM tags ORDER BY id`;
  const docs = rows.map((r) => ({
    id: String(r.id),
    data: {
      name: r.name,
      color: r.color || '#6366F1',
      usageCount: r.usage_count || 0,
      createdAt: ts(r.created_at) || FieldValue.serverTimestamp(),
      updatedAt: ts(r.updated_at) || FieldValue.serverTimestamp(),
      legacyId: r.id,
    },
  }));
  return batchWrite('tags', docs);
}

async function migrateMindMaps() {
  console.log('\n=== Migrating mind_maps ===');
  const rows = await sql`SELECT * FROM mind_maps ORDER BY id`;
  const docs = rows.map((r) => ({
    id: String(r.id),
    data: {
      userId: r.user_id ? String(r.user_id) : null,
      title: r.title,
      description: r.description || null,
      thumbnail: r.thumbnail || null,
      isPublic: r.is_public || false,
      canvasState: r.canvas_state || { zoom: 1, offsetX: 0, offsetY: 0 },
      tags: r.tags || [],
      createdAt: ts(r.created_at) || FieldValue.serverTimestamp(),
      updatedAt: ts(r.updated_at) || FieldValue.serverTimestamp(),
      legacyId: r.id,
    },
  }));
  await batchWrite('mind_maps', docs);

  // Nodes as subcollections
  console.log('  Migrating mind_map_nodes...');
  const nodes = await sql`SELECT * FROM mind_map_nodes ORDER BY mind_map_id, id`;
  let nodeCount = 0;
  const nodesByMap: Record<number, any[]> = {};
  for (const r of nodes) {
    if (!nodesByMap[r.mind_map_id]) nodesByMap[r.mind_map_id] = [];
    nodesByMap[r.mind_map_id].push(r);
  }

  for (const [mapId, mapNodes] of Object.entries(nodesByMap)) {
    const batch = db.batch();
    for (const r of mapNodes) {
      const ref = db.collection('mind_maps').doc(String(mapId)).collection('nodes').doc(String(r.id));
      batch.set(ref, {
        nodeId: r.node_id,
        label: r.label,
        x: r.x,
        y: r.y,
        width: r.width || 120,
        height: r.height || 60,
        color: r.color || '#3B82F6',
        shape: r.shape || 'rounded',
        fontSize: r.font_size || 14,
        noteId: r.note_id || null,
        referenceType: r.reference_type || null,
        referenceId: r.reference_id || null,
        metadata: r.metadata || null,
        createdAt: ts(r.created_at) || FieldValue.serverTimestamp(),
        updatedAt: ts(r.updated_at) || FieldValue.serverTimestamp(),
      });
      nodeCount++;
    }
    await batch.commit();
  }
  console.log(`  mind_map_nodes: ${nodeCount} total`);

  // Connections as subcollections
  console.log('  Migrating mind_map_connections...');
  const connections = await sql`SELECT * FROM mind_map_connections ORDER BY mind_map_id, id`;
  let connCount = 0;
  const connsByMap: Record<number, any[]> = {};
  for (const r of connections) {
    if (!connsByMap[r.mind_map_id]) connsByMap[r.mind_map_id] = [];
    connsByMap[r.mind_map_id].push(r);
  }

  for (const [mapId, mapConns] of Object.entries(connsByMap)) {
    const batch = db.batch();
    for (const r of mapConns) {
      const ref = db.collection('mind_maps').doc(String(mapId)).collection('connections').doc(String(r.id));
      batch.set(ref, {
        connectionId: r.connection_id,
        sourceNodeId: r.source_node_id,
        targetNodeId: r.target_node_id,
        label: r.label || null,
        color: r.color || '#94A3B8',
        strokeWidth: r.stroke_width || 2,
        style: r.style || 'solid',
        animated: r.animated || false,
        createdAt: ts(r.created_at) || FieldValue.serverTimestamp(),
      });
      connCount++;
    }
    await batch.commit();
  }
  console.log(`  mind_map_connections: ${connCount} total`);
}

async function migrateActivityLogs() {
  console.log('\n=== Migrating activity_logs ===');
  const rows = await sql`SELECT * FROM activity_logs ORDER BY id`;
  const docs = rows.map((r) => ({
    id: String(r.id),
    data: {
      action: r.action,
      entityType: r.entity_type,
      entityId: r.entity_id || null,
      description: r.description,
      metadata: r.metadata || null,
      createdAt: ts(r.created_at) || FieldValue.serverTimestamp(),
    },
  }));
  return batchWrite('activity_logs', docs);
}

// ─── Main ───────────────────────────────────────────────────

async function main() {
  console.log('🚀 Starting Supabase → Firestore migration...\n');
  const start = Date.now();

  const results: Record<string, number> = {};

  results.users = await migrateUsers();
  results.admin_users = await migrateAdminUsers();
  results.articles = await migrateArticles();
  results.article_mcqs = await migrateArticleMcqs();
  results.maps = await migrateMaps();
  results.question_sets = await migrateQuestionSets();
  results.practice_questions = await migratePracticeQuestions();
  await migrateRoadmap();
  results.visual_references = await migrateVisualReferences();
  results.history_timeline = await migrateHistoryTimeline();
  results.notes = await migrateNotes();
  results.tags = await migrateTags();
  await migrateMindMaps();
  results.activity_logs = await migrateActivityLogs();

  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  console.log('\n✅ Migration complete!');
  console.log(`⏱  Time: ${elapsed}s`);
  console.log('\n📊 Summary:');
  for (const [table, count] of Object.entries(results)) {
    console.log(`  ${table}: ${count} docs`);
  }

  await sql.end();
  process.exit(0);
}

main().catch((err) => {
  console.error('❌ Migration failed:', err);
  sql.end();
  process.exit(1);
});
