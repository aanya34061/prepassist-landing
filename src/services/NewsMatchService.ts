/**
 * News Match Service - Intelligent Topic Matching (HYBRID & DETERMINISTIC)
 * 
 * Strategy:
 * 1. Read FULL CONTENT of all user notes.
 * 2. Read TITLES of all recent news.
 * 3. Perform aggressive keyword matching locally (0ms latency).
 * 4. This ensures "10s" notification effectively.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { getAllNotes, getAllTags } from '../features/Notes/services/localNotesStorage';
import { MOBILE_API_URL } from '../config/api';
import { supabase } from '../lib/supabase';

const STORAGE_KEY = '@upsc_news_matches';

export interface MatchedArticle {
    noteId: number;
    noteTitle: string;
    articleId: number;
    articleTitle: string;
    articleSummary: string;
    articleSource?: string;
    articlePublishedDate?: string;
    matchReason: string;
    matchedTag: string;
    tagColor: string;
    matchedAt: string;
    isRead: boolean;
}

export interface PDFCrossRef {
    manualNoteId: number;
    manualNoteTitle: string;
    instituteNoteId: number;
    instituteNoteTitle: string;
    overlappingTags: string[];
    reason: string;
    createdAt: string;
}

const formatNewsDate = (dateString?: string): string => {
    if (!dateString) return 'recently';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'recently';
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return 'today';
    if (diffDays === 1) return 'yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
};

export interface UserStudyTopic {
    keyword: string;
    tagId?: number;
    tagColor: string;
    source: 'tag' | 'note_title' | 'note_content';
}

/**
 * Intelligent Keyword Extraction from Note Text
 * - Removes stop words
 * - Finds unique significant terms
 */
const extractSignificantTerms = (text: string): string[] => {
    if (!text) return [];

    // 1. Clean text (remove special chars, lowercase)
    const clean = text.toLowerCase().replace(/[^a-z0-9\s]/g, '');

    // 2. Split
    const words = clean.split(/\s+/);

    // 3. Filter
    return words.filter(w => w.length > 3 && !isCommonWord(w));
};

const COMMON_WORDS = new Set([
    'the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'had', 'her', 'was', 'one', 'our', 'out', 'has', 'his', 'how',
    'its', 'may', 'new', 'now', 'old', 'see', 'way', 'who', 'boy', 'did', 'get', 'let', 'put', 'say', 'she', 'too', 'use', 'with',
    'from', 'have', 'this', 'will', 'your', 'that', 'they', 'been', 'note', 'notes', 'study', 'chapter', 'unit', 'page', 'book',
    'about', 'important', 'topic', 'lesson', 'class', 'exam', 'india', 'government', 'indian', 'state', 'what', 'when', 'where'
]);

const isCommonWord = (word: string): boolean => COMMON_WORDS.has(word.toLowerCase());

export const checkNewsMatches = async (): Promise<MatchedArticle[]> => {
    try {
        console.log('[Knowledge Radar] Starting Fast Deterministic Scan (Hybrid Mode)...');

        // 1. Get ALL User Notes (Full Content)
        const notes = await getAllNotes();
        const tags = await getAllTags();

        if (notes.length === 0 && tags.length === 0) return [];

        // 2. Fetch Latest News from Supabase
        const { data: articlesData, error: fetchError } = await supabase
            .from('articles')
            .select('id, title, summary, source_url, gs_paper, published_date')
            .eq('is_published', true)
            .order('published_date', { ascending: false })
            .limit(50);
        if (fetchError) throw new Error('Supabase fetch failed');
        const articles = (articlesData || []).map((a: any) => ({
            id: a.id,
            title: a.title,
            summary: a.summary || '',
            source: a.gs_paper,
            publishedDate: a.published_date,
        }));

        const matches: MatchedArticle[] = [];
        const processedArticleIds = new Set<number>();

        // 3. Comprehensive Synonym Map for UPSC
        const synonymMap: Record<string, string[]> = {
            'aadhar': ['aadhaar', 'uidai', 'biometric', 'uid'],
            'aadhaar': ['aadhar', 'uidai', 'biometric', 'uid'],
            'gst': ['goods and services tax', 'indirect tax'],
            'isro': ['space', 'satellite', 'launch', 'pslv', 'gslv', 'chandrayaan', 'gaganyaan'],
            'rbi': ['reserve bank', 'monetary policy', 'repo rate'],
            'polity': ['constitution', 'parliament', 'article', 'supreme court'],
            'economy': ['gdp', 'inflation', 'budget', 'fiscal'],
            'farm': ['agriculture', 'msp', 'kisan'],
            'election': ['eci', 'poll', 'voter', 'evm'],
        };

        // 4. THE MATCHING ENGINE (Note Content vs News Title)

        for (const note of notes) {
            // Extract keywords from this specific note (Title + Content)
            const noteKeywords = new Set([
                ...extractSignificantTerms(note.title),
                ...extractSignificantTerms(note.content)
            ]);

            for (const article of articles) {
                if (processedArticleIds.has(article.id)) continue;

                const newsTitle = article.title.toLowerCase();

                // DOES NEWS TITLE CONTAIN ANY KEYWORD FROM THIS NOTE?
                let matchedKeyword = '';

                // Check direct keywords
                for (const kw of noteKeywords) {
                    // Direct match
                    if (newsTitle.includes(kw)) {
                        matchedKeyword = kw;
                        break;
                    }
                    // Synonym match
                    if (synonymMap[kw]) {
                        if (synonymMap[kw].some(syn => newsTitle.includes(syn))) {
                            matchedKeyword = kw;
                            break;
                        }
                    }
                }

                if (matchedKeyword) {
                    console.log(`[Knowledge Radar] MATCH: Note "${note.title}" mentions "${matchedKeyword}" -> Found in News "${article.title}"`);

                    const dateLabel = formatNewsDate(article.publishedDate);
                    matches.push({
                        noteId: note.id,
                        noteTitle: note.title,
                        articleId: article.id,
                        articleTitle: article.title,
                        articleSummary: article.summary || '',
                        articleSource: article.source,
                        articlePublishedDate: article.publishedDate,
                        matchReason: `Your notes on "${note.title}" need updating - new info about "${matchedKeyword}" came ${dateLabel}`,
                        matchedTag: matchedKeyword,
                        tagColor: '#3B82F6',
                        matchedAt: new Date().toISOString(),
                        isRead: false,
                    });
                    processedArticleIds.add(article.id);
                }
            }
        }

        // Also check Tags
        for (const tag of tags) {
            const tagKw = tag.name.toLowerCase();
            for (const article of articles) {
                if (processedArticleIds.has(article.id)) continue;
                const newsTitle = article.title.toLowerCase();
                if (newsTitle.includes(tagKw) || (synonymMap[tagKw] && synonymMap[tagKw].some(s => newsTitle.includes(s)))) {
                    const dateLabel = formatNewsDate(article.publishedDate);
                    matches.push({
                        noteId: -1,
                        noteTitle: `Tag: ${tag.name}`,
                        articleId: article.id,
                        articleTitle: article.title,
                        articleSummary: article.summary || '',
                        articleSource: article.source,
                        articlePublishedDate: article.publishedDate,
                        matchReason: `Your notes on "${tag.name}" need updating - new info came ${dateLabel}`,
                        matchedTag: tag.name,
                        tagColor: tag.color,
                        matchedAt: new Date().toISOString(),
                        isRead: false,
                    });
                    processedArticleIds.add(article.id);
                }
            }
        }

        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(matches));
        return matches;
    } catch (error) {
        console.warn('[Knowledge Radar] Skipped (backend offline?):', error);
        return [];
    }
};

export const markMatchAsRead = async (articleId: number): Promise<void> => {
    try {
        const cached = await AsyncStorage.getItem(STORAGE_KEY);
        if (cached) {
            const matches: MatchedArticle[] = JSON.parse(cached);
            const updated = matches.map(m => m.articleId === articleId ? { ...m, isRead: true } : m);
            await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
        }
    } catch (e) { }
};

export const getUnreadMatchCount = async (): Promise<number> => {
    try {
        const cached = await AsyncStorage.getItem(STORAGE_KEY);
        if (cached) {
            const matches: MatchedArticle[] = JSON.parse(cached);
            return matches.filter(m => !m.isRead).length;
        }
        return 0;
    } catch (e) { return 0; }
};

export const clearAllMatches = async (): Promise<void> => {
    await AsyncStorage.removeItem(STORAGE_KEY);
};

export const getMatchesByNoteId = async (): Promise<Record<number, number>> => {
    const cached = await AsyncStorage.getItem(STORAGE_KEY);
    if (!cached) return {};
    const matches: MatchedArticle[] = JSON.parse(cached);
    const map: Record<number, number> = {};
    for (const m of matches) {
        if (!m.isRead && m.noteId > 0) {
            map[m.noteId] = (map[m.noteId] || 0) + 1;
        }
    }
    return map;
};

export const markNoteMatchesAsRead = async (noteId: number): Promise<void> => {
    const cached = await AsyncStorage.getItem(STORAGE_KEY);
    if (!cached) return;
    const matches: MatchedArticle[] = JSON.parse(cached);
    const updated = matches.map(m => m.noteId === noteId ? { ...m, isRead: true } : m);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
};

export const checkPDFCrossReferences = async (): Promise<PDFCrossRef[]> => {
    try {
        const notes = await getAllNotes();
        if (notes.length === 0) return [];

        const manualNotes = notes.filter(n => n.sourceType === 'manual');
        const instituteNotes = notes.filter(n =>
            n.sourceType === 'institute' || n.sourceType === 'book' || n.sourceType === 'report'
        );

        if (manualNotes.length === 0 || instituteNotes.length === 0) return [];

        const crossRefs: PDFCrossRef[] = [];

        for (const manual of manualNotes) {
            const manualTagNames = manual.tags.map(t => t.name.toLowerCase());
            if (manualTagNames.length === 0) continue;

            for (const inst of instituteNotes) {
                // Only consider institute notes created AFTER the manual note
                if (new Date(inst.createdAt).getTime() <= new Date(manual.createdAt).getTime()) continue;

                const instTagNames = inst.tags.map(t => t.name.toLowerCase());
                const overlap = manualTagNames.filter(t => instTagNames.includes(t));

                if (overlap.length > 0) {
                    crossRefs.push({
                        manualNoteId: manual.id,
                        manualNoteTitle: manual.title,
                        instituteNoteId: inst.id,
                        instituteNoteTitle: inst.title,
                        overlappingTags: overlap,
                        reason: `New institute notes on "${overlap.join(', ')}" have additional information`,
                        createdAt: inst.createdAt,
                    });
                }
            }
        }

        return crossRefs;
    } catch (error) {
        console.warn('[Knowledge Radar] PDF cross-ref check failed:', error);
        return [];
    }
};

export const forceRefreshMatches = async (): Promise<MatchedArticle[]> => {
    return checkNewsMatches();
};
