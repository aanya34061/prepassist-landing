/**
 * savedArticlesService.js
 * Handles saving, retrieving, and deleting articles shared from external apps.
 * Auto-scrapes URL content and generates AI summary.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { smartScrape, extractDomain } from '../features/Notes/services/webScraper';
import { summarizeNoteContent } from '../features/Notes/services/aiSummarizer';

const STORAGE_KEY = '@upsc_saved_articles';

/**
 * Get all saved articles from local storage.
 */
export const getSavedArticles = async () => {
  try {
    const json = await AsyncStorage.getItem(STORAGE_KEY);
    const articles = json ? JSON.parse(json) : [];
    return articles.sort((a, b) => new Date(b.savedAt) - new Date(a.savedAt));
  } catch (error) {
    console.warn('[SavedArticles] Error loading:', error.message);
    return [];
  }
};

/**
 * Save an article by URL — scrape content + generate summary.
 * Deduplicates by URL. Returns the saved article object.
 */
export const saveArticle = async (url, onStatus) => {
  try {
    // Check for duplicate
    const existing = await getSavedArticles();
    const duplicate = existing.find(a => a.url === url);
    if (duplicate) {
      console.log('[SavedArticles] Already saved:', url);
      return { article: duplicate, isDuplicate: true };
    }

    // Scrape the URL
    onStatus?.('Scraping article...');
    console.log('[SavedArticles] Scraping:', url);
    const scraped = await smartScrape(url);

    // Only bail if there's an error AND no content (partial results still have content)
    if (scraped.error && !scraped.content) {
      return { error: scraped.error };
    }

    const title = scraped.title || url;
    const content = scraped.content || '';
    const domain = extractDomain(url);

    // Generate AI summary
    let summary = '';
    console.log('[SavedArticles] Content length:', content.length, 'chars');

    if (content.length > 100) {
      try {
        // Cap content at 4000 chars to avoid token limits
        const trimmedContent = content.substring(0, 4000);
        onStatus?.('Generating AI summary...');
        console.log('[SavedArticles] Generating AI summary...');
        const aiResult = await summarizeNoteContent(trimmedContent);
        console.log('[SavedArticles] AI result:', aiResult.error || `${aiResult.summary.length} chars summary`);
        if (aiResult.summary && !aiResult.error) {
          summary = aiResult.summary;
        } else {
          // Fallback to meta description or content snippet
          summary = scraped.metaDescription || content.substring(0, 300).trim() + '...';
        }
      } catch (e) {
        console.warn('[SavedArticles] Summary generation failed:', e.message);
        summary = scraped.metaDescription || content.substring(0, 300).trim() + '...';
      }
    } else {
      summary = scraped.metaDescription || content.substring(0, 300).trim() || 'No summary available.';
    }

    console.log('[SavedArticles] Final summary:', summary.substring(0, 80) + '...');

    const article = {
      id: Date.now(),
      url,
      title,
      summary,
      domain,
      savedAt: new Date().toISOString(),
    };

    // Save to storage
    onStatus?.('Saving article...');
    existing.unshift(article);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
    console.log('[SavedArticles] Saved:', title);

    return { article, isDuplicate: false };
  } catch (error) {
    console.error('[SavedArticles] Save failed:', error.message);
    return { error: 'Failed to save article. Please try again.' };
  }
};

/**
 * Save an article directly with pre-scraped data (no re-scraping).
 * Use this when you already have the article content.
 */
export const saveArticleDirect = async ({ url, title, content, domain }) => {
  try {
    const existing = await getSavedArticles();
    const duplicate = existing.find(a => a.url === url);
    if (duplicate) {
      console.log('[SavedArticles] Already saved:', url);
      return { article: duplicate, isDuplicate: true };
    }

    // Use content snippet as summary (avoid re-calling AI to keep it fast)
    const summary = content
      ? content.substring(0, 300).trim() + (content.length > 300 ? '...' : '')
      : 'No summary available.';

    const article = {
      id: Date.now(),
      url,
      title: title || domain || url,
      summary,
      domain: domain || extractDomain(url),
      savedAt: new Date().toISOString(),
    };

    existing.unshift(article);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
    console.log('[SavedArticles] Direct save:', article.title);

    return { article, isDuplicate: false };
  } catch (error) {
    console.error('[SavedArticles] Direct save failed:', error.message);
    return { error: 'Failed to save article.' };
  }
};

/**
 * Delete a saved article by ID.
 */
export const deleteSavedArticle = async (id) => {
  try {
    const articles = await getSavedArticles();
    const filtered = articles.filter(a => a.id !== id);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    console.log('[SavedArticles] Deleted:', id);
    return true;
  } catch (error) {
    console.warn('[SavedArticles] Delete failed:', error.message);
    return false;
  }
};
