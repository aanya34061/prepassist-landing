/**
 * PDF Text Extraction using pdfjs-dist (no OCR needed for text-based PDFs)
 * Returns extracted text or empty string if PDF is scanned/image-based.
 */
import { Platform } from 'react-native';

let pdfjsLib = null;

/**
 * Lazily load and configure pdfjs-dist (web only).
 */
async function getPdfjs() {
  if (pdfjsLib) return pdfjsLib;

  pdfjsLib = require('pdfjs-dist');

  // Disable the worker to avoid CDN/CORS issues in Expo web.
  // This runs parsing on the main thread — fine for text extraction.
  pdfjsLib.GlobalWorkerOptions.workerSrc = '';

  return pdfjsLib;
}

/**
 * Convert a blob: URI to an ArrayBuffer (web only).
 */
async function blobUriToArrayBuffer(blobUri) {
  const response = await fetch(blobUri);
  return response.arrayBuffer();
}

/**
 * Extract text from a PDF using pdfjs-dist.
 * Works on web platform. Returns empty string on native or on failure.
 *
 * @param {string} source - File URI / blob URI (when sourceType='uri') or raw base64 string (when sourceType='base64')
 * @param {'uri' | 'base64'} sourceType - Whether source is a URI or base64 data
 * @returns {Promise<string>} Extracted text, or empty string if extraction fails
 */
export async function extractTextFromPDF(source, sourceType = 'uri') {
  // pdfjs-dist relies on browser APIs — only works on web
  if (Platform.OS !== 'web') {
    return '';
  }

  try {
    const pdfjs = await getPdfjs();

    let docParams;

    if (sourceType === 'base64') {
      // Convert base64 to Uint8Array
      const binaryString = atob(source);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      docParams = { data: bytes };
    } else if (source.startsWith('blob:') || source.startsWith('http')) {
      // Blob URIs and http(s) URLs: fetch as ArrayBuffer for reliable loading
      const arrayBuffer = await blobUriToArrayBuffer(source);
      docParams = { data: new Uint8Array(arrayBuffer) };
    } else {
      // Fallback: let pdfjs try the URI directly
      docParams = { url: source };
    }

    // Disable worker for this document (runs on main thread)
    docParams.disableWorker = true;

    const pdf = await pdfjs.getDocument(docParams).promise;
    const numPages = pdf.numPages;
    const textParts = [];

    for (let i = 1; i <= numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item) => item.str)
        .join(' ');
      if (pageText.trim()) {
        textParts.push(pageText.trim());
      }
    }

    const fullText = textParts.join('\n\n');
    console.log(`[pdfTextExtract] Extracted ${fullText.length} chars from ${numPages} pages`);
    return fullText;
  } catch (error) {
    console.warn('[pdfTextExtract] Failed:', error?.message || error);
    return '';
  }
}
