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
      // Convert Date objects to ISO strings for Supabase
      mapped[snake] = val instanceof Date ? val.toISOString() : val;
    }
  }

  return mapped;
}

export function syncArticleCreate(firestoreId: string, data: Record<string, any>) {
  const sb = getSupabase();
  if (!sb) return;

  const row = { ...mapArticleToSupabase(data), firestore_id: firestoreId };

  sb.from('articles')
    .insert(row)
    .then(({ error }) => {
      if (error) console.error('Supabase sync (create) failed:', error.message);
      else console.log(`Supabase sync: article ${firestoreId} created`);
    })
    .catch((err) => console.error('Supabase sync (create) exception:', err));
}

export function syncArticleUpdate(firestoreId: string, data: Record<string, any>) {
  const sb = getSupabase();
  if (!sb) return;

  const row = mapArticleToSupabase(data);

  sb.from('articles')
    .update(row)
    .eq('firestore_id', firestoreId)
    .then(({ error }) => {
      if (error) console.error('Supabase sync (update) failed:', error.message);
      else console.log(`Supabase sync: article ${firestoreId} updated`);
    })
    .catch((err) => console.error('Supabase sync (update) exception:', err));
}

export function syncArticleDelete(firestoreId: string) {
  const sb = getSupabase();
  if (!sb) return;

  sb.from('articles')
    .delete()
    .eq('firestore_id', firestoreId)
    .then(({ error }) => {
      if (error) console.error('Supabase sync (delete) failed:', error.message);
      else console.log(`Supabase sync: article ${firestoreId} deleted`);
    })
    .catch((err) => console.error('Supabase sync (delete) exception:', err));
}

export function syncArticleTogglePublish(firestoreId: string, isPublished: boolean) {
  const sb = getSupabase();
  if (!sb) return;

  sb.from('articles')
    .update({ is_published: isPublished, updated_at: new Date().toISOString() })
    .eq('firestore_id', firestoreId)
    .then(({ error }) => {
      if (error) console.error('Supabase sync (toggle-publish) failed:', error.message);
      else console.log(`Supabase sync: article ${firestoreId} is_published=${isPublished}`);
    })
    .catch((err) => console.error('Supabase sync (toggle-publish) exception:', err));
}
