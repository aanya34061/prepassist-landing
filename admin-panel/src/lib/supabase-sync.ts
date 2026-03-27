import { getSupabase } from './supabase';

/**
 * Maps camelCase Firestore article fields to snake_case Supabase columns.
 */
function mapArticleToSupabase(data: Record<string, any>): Record<string, any> {
  const mapped: Record<string, any> = {};

  const fieldMap: Record<string, string> = {
    title: 'title',
    author: 'author',
    sourceUrl: 'source_url',
    publishedDate: 'published_date',
    summary: 'summary',
    metaDescription: 'meta_description',
    content: 'content',
    images: 'images',
    gsPaper: 'gs_paper',
    subject: 'subject',
    tags: 'tags',
    isPublished: 'is_published',
    scrapedAt: 'scraped_at',
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  };

  for (const [camel, snake] of Object.entries(fieldMap)) {
    if (camel in data) {
      const val = data[camel];
      mapped[snake] = val instanceof Date ? val.toISOString() : val;
    }
  }

  return mapped;
}

export async function syncArticleCreate(firestoreId: string, data: Record<string, any>) {
  const sb = getSupabase();
  if (!sb) return;

  try {
    const row = { ...mapArticleToSupabase(data), firestore_id: firestoreId };
    const { error } = await sb.from('articles').insert(row);
    if (error) console.error('Supabase sync (create) failed:', error.message);
    else console.log(`Supabase sync: article ${firestoreId} created`);
  } catch (err) {
    console.error('Supabase sync (create) exception:', err);
  }
}

export async function syncArticleUpdate(firestoreId: string, data: Record<string, any>) {
  const sb = getSupabase();
  if (!sb) return;

  try {
    const row = mapArticleToSupabase(data);
    const { error } = await sb.from('articles').update(row).eq('firestore_id', firestoreId);
    if (error) console.error('Supabase sync (update) failed:', error.message);
    else console.log(`Supabase sync: article ${firestoreId} updated`);
  } catch (err) {
    console.error('Supabase sync (update) exception:', err);
  }
}

export async function syncArticleDelete(firestoreId: string) {
  const sb = getSupabase();
  if (!sb) return;

  try {
    const { error } = await sb.from('articles').delete().eq('firestore_id', firestoreId);
    if (error) console.error('Supabase sync (delete) failed:', error.message);
    else console.log(`Supabase sync: article ${firestoreId} deleted`);
  } catch (err) {
    console.error('Supabase sync (delete) exception:', err);
  }
}

export async function syncArticleTogglePublish(firestoreId: string, isPublished: boolean) {
  const sb = getSupabase();
  if (!sb) return;

  try {
    const { error } = await sb.from('articles')
      .update({ is_published: isPublished, updated_at: new Date().toISOString() })
      .eq('firestore_id', firestoreId);
    if (error) console.error('Supabase sync (toggle-publish) failed:', error.message);
    else console.log(`Supabase sync: article ${firestoreId} is_published=${isPublished}`);
  } catch (err) {
    console.error('Supabase sync (toggle-publish) exception:', err);
  }
}

// --------------- Article MCQs ---------------

export async function syncArticleMCQs(
  articleFirestoreId: string,
  mcqs: Array<{
    question: string;
    optionA: string;
    optionB: string;
    optionC: string;
    optionD: string;
    correctAnswer: string;
    explanation?: string | null;
  }>
) {
  const sb = getSupabase();
  if (!sb) return;

  try {
    const { data, error } = await sb.from('articles')
      .select('id')
      .eq('firestore_id', articleFirestoreId)
      .single();

    if (error || !data) {
      console.error('Supabase sync (mcqs): article lookup failed:', error?.message);
      return;
    }

    const rows = mcqs.map((mcq) => ({
      article_id: data.id,
      question: mcq.question,
      option_a: mcq.optionA,
      option_b: mcq.optionB,
      option_c: mcq.optionC,
      option_d: mcq.optionD,
      correct_answer: mcq.correctAnswer,
      explanation: mcq.explanation || null,
    }));

    const { error: insertErr } = await sb.from('article_mcqs').insert(rows);
    if (insertErr) console.error('Supabase sync (mcqs) insert failed:', insertErr.message);
    else console.log(`Supabase sync: ${rows.length} MCQs synced for article ${articleFirestoreId}`);
  } catch (err) {
    console.error('Supabase sync (mcqs) exception:', err);
  }
}

// --------------- Question Sets ---------------

export async function syncQuestionSetCreate(firestoreId: string, data: Record<string, any>): Promise<{ ok: boolean; error?: string }> {
  const sb = getSupabase();
  if (!sb) return { ok: false, error: 'supabase client is null' };

  try {
    const row = {
      firestore_id: firestoreId,
      title: data.title,
      description: data.description || null,
      year: data.year || null,
      is_published: data.isPublished || false,
      created_at: data.createdAt || new Date().toISOString(),
      updated_at: data.updatedAt || new Date().toISOString(),
    };

    const { error } = await sb.from('question_sets').insert(row);
    if (error) {
      console.error('Supabase sync (question-set create) failed:', error.message);
      return { ok: false, error: error.message };
    }
    console.log(`Supabase sync: question set ${firestoreId} created`);
    return { ok: true };
  } catch (err: any) {
    console.error('Supabase sync (question-set create) exception:', err);
    return { ok: false, error: err?.message || String(err) };
  }
}

export async function syncQuestionSetDelete(firestoreId: string) {
  const sb = getSupabase();
  if (!sb) return;

  try {
    const { error } = await sb.from('question_sets').delete().eq('firestore_id', firestoreId);
    if (error) console.error('Supabase sync (question-set delete) failed:', error.message);
    else console.log(`Supabase sync: question set ${firestoreId} deleted`);
  } catch (err) {
    console.error('Supabase sync (question-set delete) exception:', err);
  }
}

export async function syncQuestionSetTogglePublish(firestoreId: string, isPublished: boolean) {
  const sb = getSupabase();
  if (!sb) return;

  try {
    const { error } = await sb.from('question_sets')
      .update({ is_published: isPublished, updated_at: new Date().toISOString() })
      .eq('firestore_id', firestoreId);
    if (error) console.error('Supabase sync (question-set toggle) failed:', error.message);
    else console.log(`Supabase sync: question set ${firestoreId} is_published=${isPublished}`);
  } catch (err) {
    console.error('Supabase sync (question-set toggle) exception:', err);
  }
}

// --------------- Practice Questions ---------------

export async function syncPracticeQuestionCreate(
  questionSetFirestoreId: string,
  questionData: {
    question: string;
    optionA: string;
    optionB: string;
    optionC: string;
    optionD: string;
    correctAnswer: string;
    explanation: string;
  }
) {
  const sb = getSupabase();
  if (!sb) return;

  try {
    const { data, error } = await sb.from('question_sets')
      .select('id')
      .eq('firestore_id', questionSetFirestoreId)
      .single();

    if (error || !data) {
      console.error('Supabase sync (practice-question): question set lookup failed:', error?.message);
      return;
    }

    const row = {
      question_set_id: data.id,
      question: questionData.question,
      option_a: questionData.optionA,
      option_b: questionData.optionB,
      option_c: questionData.optionC,
      option_d: questionData.optionD,
      correct_answer: questionData.correctAnswer,
      explanation: questionData.explanation,
    };

    const { error: insertErr } = await sb.from('practice_questions').insert(row);
    if (insertErr) console.error('Supabase sync (practice-question) insert failed:', insertErr.message);
    else console.log(`Supabase sync: practice question synced to set ${questionSetFirestoreId}`);
  } catch (err) {
    console.error('Supabase sync (practice-question) exception:', err);
  }
}
