/**
 * PDF Text Extraction using pdfjs-dist (no OCR needed for text-based PDFs)
 * Returns extracted text or empty string if PDF is scanned/image-based.
 */
import { Platform } from 'react-native';

/**
 * Extract text from a PDF using pdfjs-dist.
 * Works on web platform. Returns empty string on native or on failure.
 *
 * @param {string} source - File URI (native) or base64 data string
 * @param {'uri' | 'base64'} sourceType - Whether source is a URI or base64 data
 * @returns {Promise<string>} Extracted text, or empty string if extraction fails
 */
export async function extractTextFromPDF(source, sourceType = 'uri') {
  // pdfjs-dist only works reliably on web
  if (Platform.OS !== 'web') {
    return '';
  }

  try {
    const pdfjsLib = await import('pdfjs-dist');

    // Set up the worker
    if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
      pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
    }

    let loadingTask;

    if (sourceType === 'base64') {
      // Convert base64 to Uint8Array
      const binaryString = atob(source);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      loadingTask = pdfjsLib.getDocument({ data: bytes });
    } else {
      // Load from URI
      loadingTask = pdfjsLib.getDocument(source);
    }

    const pdf = await loadingTask.promise;
    const numPages = pdf.numPages;
    const textParts = [];

    for (let i = 1; i <= numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item) => item.str)
        .join(' ');
      if (pageText.trim()) {
        textParts.push(pageText);
      }
    }

    const fullText = textParts.join('\n\n');
    console.log(`[pdfTextExtract] Extracted ${fullText.length} chars from ${numPages} pages`);
    return fullText;
  } catch (error) {
    console.warn('[pdfTextExtract] Failed to extract text:', error.message);
    return '';
  }
}
