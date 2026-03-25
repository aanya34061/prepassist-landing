/**
 * PDF Text Extraction using Gemini via OpenRouter API.
 * Sends the PDF as base64 to Gemini and asks it to extract all text.
 * Returns extracted text or empty string on failure.
 */
import { OPENROUTER_API_KEY } from './secureKey';

const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1/chat/completions';

/**
 * Extract text from a PDF using Gemini API.
 *
 * @param {string} base64Data - Raw base64 string of the PDF
 * @param {'uri' | 'base64'} sourceType - Only 'base64' is supported
 * @returns {Promise<string>} Extracted text, or empty string on failure
 */
export async function extractTextFromPDF(base64Data, sourceType = 'base64') {
  if (sourceType !== 'base64' || !base64Data) return '';

  try {
    const response = await fetch(OPENROUTER_BASE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Extract ALL text content from this PDF document. Return ONLY the raw text, preserving paragraphs and structure. Do not add any commentary, headers, or formatting — just the exact text from the document.',
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:application/pdf;base64,${base64Data}`,
                },
              },
            ],
          },
        ],
        max_tokens: 8192,
        temperature: 0,
      }),
    });

    if (!response.ok) {
      console.warn('[pdfTextExtract] API error:', response.status);
      return '';
    }

    const result = await response.json();
    const text = result?.choices?.[0]?.message?.content || '';
    console.log(`[pdfTextExtract] Gemini extracted ${text.length} chars`);
    return text;
  } catch (err) {
    console.warn('[pdfTextExtract] Failed:', err?.message || err);
    return '';
  }
}
