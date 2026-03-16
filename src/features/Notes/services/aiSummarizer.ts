/**
 * AI Summarizer Service for UPSC Notes
 * Uses Google Gemini 2.0 Flash via OpenRouter
 */

import { OPENROUTER_API_KEY } from '../../../utils/secureKey';

const MODEL = 'google/gemini-2.0-flash-001';
const API_URL = 'https://openrouter.ai/api/v1/chat/completions';

const SYSTEM_PROMPT = `You are an expert UPSC tutor and content summarizer. 
Your goal is to summarize the user's note content into clear, concise, and study-friendly bullet points.
Focus on:
1. Key concepts and definitions.
2. Important facts, dates, and figures.
3. Cause and effect relationships.
4. Structuring the summary logically.

Format the output as a clean list. 
IMPORTANT: Do NOT use markdown bolding (asterisks like **) or headings (hashes like #). 
Just use plain text with simple bullet points (hyphens -).`;

export interface SummarizeResponse {
    summary: string;
    error?: string;
}

export const summarizeNoteContent = async (content: string): Promise<SummarizeResponse> => {
    if (!content || content.trim().length === 0) {
        return { summary: '', error: 'Content is empty' };
    }

    // Check key
    if (!OPENROUTER_API_KEY) {
        return { summary: '', error: 'API Key not configured' };
    }

    try {
        console.log('[AISummarizer] Summarizing content...');

        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': 'https://upsc-prep.app',
                'X-Title': 'UPSC Prep Notes Summarizer',
            },
            body: JSON.stringify({
                model: MODEL,
                messages: [
                    { role: 'system', content: SYSTEM_PROMPT },
                    { role: 'user', content: `Please summarize the following note content into bullet points for UPSC preparation:\n\n${content}` }
                ],
                temperature: 0.5,
                max_tokens: 2048,
            }),
        });

        if (!response.ok) {
            const errData = await response.json();
            throw new Error(errData.error?.message || 'API Request failed');
        }

        const data = await response.json();
        let summary = data.choices?.[0]?.message?.content || '';

        // Clean up any stray markdown if AI ignores prompt
        summary = summary.replace(/\*\*/g, '').replace(/#/g, '').replace(/\*/g, '').trim();

        return { summary };

    } catch (error) {
        console.error('[AISummarizer] Error:', error);
        return {
            summary: '',
            error: error instanceof Error ? error.message : 'Failed to generate summary'
        };
    }
};

const ANALYSIS_PROMPT = `You are an expert UPSC exam analyst.
Analyze the given note and produce a concise, exam-oriented summary covering:
1. Key concepts and definitions
2. Important facts, dates, and figures relevant to UPSC
3. How this topic connects to the UPSC syllabus (Prelims / Mains / Essay)
4. Possible exam questions from this content

IMPORTANT: Do NOT use markdown bolding (asterisks like **) or headings (hashes like #).
Just use plain text with simple bullet points (hyphens -) and UPPERCASE section headers.`;

export const analyzeForUPSC = async (content: string, title?: string): Promise<SummarizeResponse> => {
    if (!content || content.trim().length === 0) {
        return { summary: '', error: 'Content is empty' };
    }

    if (!OPENROUTER_API_KEY) {
        return { summary: '', error: 'API Key not configured' };
    }

    try {
        console.log('[AISummarizer] Analyzing note for UPSC...');

        const userMessage = title
            ? `Analyze the following note titled "${title}" for UPSC exam relevance:\n\n${content}`
            : `Analyze the following note for UPSC exam relevance:\n\n${content}`;

        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': 'https://upsc-prep.app',
                'X-Title': 'UPSC Prep Notes Analyzer',
            },
            body: JSON.stringify({
                model: MODEL,
                messages: [
                    { role: 'system', content: ANALYSIS_PROMPT },
                    { role: 'user', content: userMessage }
                ],
                temperature: 0.5,
                max_tokens: 2048,
            }),
        });

        if (!response.ok) {
            const errData = await response.json();
            throw new Error(errData.error?.message || 'API Request failed');
        }

        const data = await response.json();
        let summary = data.choices?.[0]?.message?.content || '';

        summary = summary.replace(/\*\*/g, '').replace(/#/g, '').replace(/\*/g, '').trim();

        return { summary };

    } catch (error) {
        console.error('[AISummarizer] Analysis error:', error);
        return {
            summary: '',
            error: error instanceof Error ? error.message : 'Failed to analyze note'
        };
    }
};
