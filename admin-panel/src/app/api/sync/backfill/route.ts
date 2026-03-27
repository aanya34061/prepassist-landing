import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';
import { verifyAuth } from '@/lib/auth';
import { getSupabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
    // Allow auth via cookie OR a secret query param for easy one-time use
    const { searchParams } = new URL(request.url);
    const secret = searchParams.get('secret');
    const user = await verifyAuth(request);
    if (!user && secret !== 'backfill2026') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const sb = getSupabase();
    if (!sb) {
        return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
    }

    const db = getAdminDb();
    const results = { articles: 0, articleMcqs: 0, questionSets: 0, practiceQuestions: 0, errors: [] as string[] };

    // ---- Backfill Articles ----
    try {
        const articlesSnap = await db.collection('articles').get();
        for (const doc of articlesSnap.docs) {
            const d = doc.data();
            const row = {
                firestore_id: doc.id,
                title: d.title,
                author: d.author || null,
                source_url: d.sourceUrl || null,
                published_date: d.publishedDate?.toDate?.()?.toISOString?.() || d.publishedDate || null,
                summary: d.summary || null,
                meta_description: d.metaDescription || null,
                content: d.content || null,
                images: d.images || null,
                gs_paper: d.gsPaper || null,
                subject: d.subject || null,
                tags: d.tags || [],
                is_published: d.isPublished || false,
                scraped_at: d.scrapedAt?.toDate?.()?.toISOString?.() || d.scrapedAt || null,
                created_at: d.createdAt?.toDate?.()?.toISOString?.() || d.createdAt || new Date().toISOString(),
                updated_at: d.updatedAt?.toDate?.()?.toISOString?.() || d.updatedAt || new Date().toISOString(),
            };

            const { error } = await sb.from('articles').upsert(row, { onConflict: 'firestore_id' });
            if (error) results.errors.push(`article ${doc.id}: ${error.message}`);
            else results.articles++;

            // Backfill MCQs for this article
            const mcqsSnap = await doc.ref.collection('mcqs').get();
            if (!mcqsSnap.empty) {
                // Look up Supabase article ID
                const { data: articleRow } = await sb.from('articles').select('id').eq('firestore_id', doc.id).single();
                if (articleRow) {
                    const mcqRows = mcqsSnap.docs.map(mcqDoc => {
                        const m = mcqDoc.data();
                        return {
                            article_id: articleRow.id,
                            question: m.question,
                            option_a: m.optionA,
                            option_b: m.optionB,
                            option_c: m.optionC,
                            option_d: m.optionD,
                            correct_answer: m.correctAnswer,
                            explanation: m.explanation || null,
                        };
                    });

                    // Delete existing MCQs for this article to avoid duplicates
                    await sb.from('article_mcqs').delete().eq('article_id', articleRow.id);
                    const { error: mcqErr } = await sb.from('article_mcqs').insert(mcqRows);
                    if (mcqErr) results.errors.push(`mcqs for article ${doc.id}: ${mcqErr.message}`);
                    else results.articleMcqs += mcqRows.length;
                }
            }
        }
    } catch (err: any) {
        results.errors.push(`articles batch: ${err.message}`);
    }

    // ---- Backfill Question Sets + Practice Questions ----
    try {
        const setsSnap = await db.collection('question_sets').get();
        for (const doc of setsSnap.docs) {
            const d = doc.data();
            const row = {
                firestore_id: doc.id,
                title: d.title,
                description: d.description || null,
                year: d.year || null,
                is_published: d.isPublished || false,
                created_at: d.createdAt || new Date().toISOString(),
                updated_at: d.updatedAt || new Date().toISOString(),
            };

            const { error } = await sb.from('question_sets').upsert(row, { onConflict: 'firestore_id' });
            if (error) {
                results.errors.push(`question_set ${doc.id}: ${error.message}`);
                continue;
            }
            results.questionSets++;

            // Backfill questions in subcollection
            const questionsSnap = await doc.ref.collection('questions').get();
            if (!questionsSnap.empty) {
                const { data: setRow } = await sb.from('question_sets').select('id').eq('firestore_id', doc.id).single();
                if (setRow) {
                    const qRows = questionsSnap.docs.map(qDoc => {
                        const q = qDoc.data();
                        return {
                            question_set_id: setRow.id,
                            question: q.question,
                            option_a: q.optionA,
                            option_b: q.optionB,
                            option_c: q.optionC,
                            option_d: q.optionD,
                            correct_answer: q.correctAnswer,
                            explanation: q.explanation || '',
                        };
                    });

                    // Delete existing questions for this set to avoid duplicates
                    await sb.from('practice_questions').delete().eq('question_set_id', setRow.id);
                    const { error: qErr } = await sb.from('practice_questions').insert(qRows);
                    if (qErr) results.errors.push(`questions for set ${doc.id}: ${qErr.message}`);
                    else results.practiceQuestions += qRows.length;
                }
            }
        }
    } catch (err: any) {
        results.errors.push(`question_sets batch: ${err.message}`);
    }

    // ---- Reverse sync: Supabase articles → Firestore (so dashboard shows all) ----
    try {
        const firestoreArticleIds = (await db.collection('articles').get()).docs.map(d => d.id);
        const { data: allSupabaseArticles } = await sb.from('articles').select('*');
        let reverseSynced = 0;

        if (allSupabaseArticles) {
            for (const row of allSupabaseArticles) {
                // Skip if already in Firestore (matched by firestore_id)
                if (row.firestore_id && firestoreArticleIds.includes(row.firestore_id)) continue;

                // Create in Firestore
                const articleData: Record<string, any> = {
                    title: row.title || '',
                    author: row.author || null,
                    sourceUrl: row.source_url || null,
                    publishedDate: row.published_date ? new Date(row.published_date) : null,
                    summary: row.summary || null,
                    metaDescription: row.meta_description || null,
                    content: row.content || [],
                    images: row.images || [],
                    gsPaper: row.gs_paper || null,
                    subject: row.subject || null,
                    tags: row.tags || [],
                    isPublished: row.is_published || false,
                    scrapedAt: row.scraped_at ? new Date(row.scraped_at) : new Date(),
                    createdAt: row.created_at ? new Date(row.created_at) : new Date(),
                    updatedAt: row.updated_at ? new Date(row.updated_at) : new Date(),
                };

                const docRef = await db.collection('articles').add(articleData);

                // Update Supabase row with the new firestore_id
                await sb.from('articles').update({ firestore_id: docRef.id }).eq('id', row.id);
                reverseSynced++;
            }
        }
        (results as any).reverseArticles = reverseSynced;
    } catch (err: any) {
        results.errors.push(`reverse sync: ${err.message}`);
    }

    // ---- Clean up orphaned Supabase rows not in Firestore ----
    try {
        const firestoreSetIds = (await db.collection('question_sets').get()).docs.map(d => d.id);
        const { data: supabaseSets } = await sb.from('question_sets').select('id, firestore_id');
        if (supabaseSets) {
            for (const row of supabaseSets) {
                if (row.firestore_id && !firestoreSetIds.includes(row.firestore_id)) {
                    await sb.from('question_sets').delete().eq('id', row.id);
                }
            }
        }

        const firestoreArticleIds = (await db.collection('articles').get()).docs.map(d => d.id);
        const { data: supabaseArticles } = await sb.from('articles').select('id, firestore_id');
        if (supabaseArticles) {
            for (const row of supabaseArticles) {
                if (row.firestore_id && !firestoreArticleIds.includes(row.firestore_id)) {
                    await sb.from('articles').delete().eq('id', row.id);
                }
            }
        }
    } catch (err: any) {
        results.errors.push(`cleanup: ${err.message}`);
    }

    return NextResponse.json({
        message: 'Backfill complete',
        synced: results,
    });
}
