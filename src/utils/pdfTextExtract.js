/**
 * PDF Text Extraction using pdfjs-dist (no OCR needed for text-based PDFs)
 * Returns extracted text or empty string if PDF is scanned/image-based.
 *
 * All pdfjs-dist usage is fully isolated — a failure here NEVER crashes the app.
 */
import { Platform } from 'react-native';

/**
 * Extract text from a PDF using pdfjs-dist.
 * Works on web platform only. Returns empty string on native or on any failure.
 *
 * @param {string} source - File URI / blob URI (sourceType='uri') or base64 string (sourceType='base64')
 * @param {'uri' | 'base64'} sourceType
 * @returns {Promise<string>}
 */
export async function extractTextFromPDF(source, sourceType = 'uri') {
  if (Platform.OS !== 'web') return '';

  try {
    // Lazy-load pdfjs-dist only when actually needed
    let pdfjs;
    try {
      pdfjs = require('pdfjs-dist/legacy/build/pdf');
    } catch (loadErr) {
      console.warn('[pdfTextExtract] Could not load pdfjs-dist:', loadErr?.message);
      return '';
    }

    // Disable worker to avoid CDN/CORS issues
    if (pdfjs.GlobalWorkerOptions) {
      pdfjs.GlobalWorkerOptions.workerSrc = '';
    }

    let data;
    if (sourceType === 'base64') {
      const bin = atob(source);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      data = bytes;
    } else {
      const resp = await fetch(source);
      const buf = await resp.arrayBuffer();
      data = new Uint8Array(buf);
    }

    const pdf = await pdfjs.getDocument({ data, disableWorker: true }).promise;
    const parts = [];

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const tc = await page.getTextContent();
      const text = tc.items.map((it) => it.str).join(' ');
      if (text.trim()) parts.push(text.trim());
    }

    const fullText = parts.join('\n\n');
    console.log(`[pdfTextExtract] Extracted ${fullText.length} chars from ${pdf.numPages} pages`);
    return fullText;
  } catch (err) {
    console.warn('[pdfTextExtract] Failed:', err?.message || err);
    return '';
  }
}
