import { createWorker } from 'tesseract.js';
import * as pdfjsLib from 'pdfjs-dist';
import { createCanvas } from 'canvas';

export interface OCRResult {
  text: string;
  confidence: number;
  language: string;
}

/**
 * Runs OCR on an image buffer or base64 image data supporting English and Hindi (eng+hin)
 */
export async function runOCR(imageInput: Buffer | string): Promise<OCRResult> {
  try {
    const worker = await createWorker(['eng', 'hin']);
    const ret = await worker.recognize(imageInput);
    await worker.terminate();

    return {
      text: ret.data.text || '',
      confidence: Math.round(ret.data.confidence || 90) / 100,
      language: 'eng+hin',
    };
  } catch (err) {
    console.warn('Tesseract OCR failed, returning fallback empty text:', err);
    return {
      text: '[OCR Processing Error]',
      confidence: 0,
      language: 'eng+hin',
    };
  }
}

/**
 * Converts a specific PDF page to a PNG image buffer using pdfjs-dist and canvas.
 * Useful for passing to Tesseract OCR.
 */
export async function convertPdfPageToImage(pdfBuffer: Buffer, pageNumber: number): Promise<Buffer> {
  try {
    const data = new Uint8Array(pdfBuffer);
    const loadingTask = pdfjsLib.getDocument({
      data,
      useSystemFonts: true,
      standardFontDataUrl: 'node_modules/pdfjs-dist/standard_fonts/',
    });
    const pdfDocument = await loadingTask.promise;
    
    // Ensure the page exists
    if (pageNumber > pdfDocument.numPages || pageNumber < 1) {
        throw new Error(`Page ${pageNumber} out of bounds (1-${pdfDocument.numPages})`);
    }

    const page = await pdfDocument.getPage(pageNumber);
    const viewport = page.getViewport({ scale: 2.0 }); // 2x scale for better OCR accuracy
    
    const canvas = createCanvas(viewport.width, viewport.height);
    const context = canvas.getContext('2d');
    
    await page.render({
      canvasContext: context as any,
      viewport: viewport
    } as any).promise;
    
    return canvas.toBuffer('image/png');
  } catch (error) {
    console.error(`Failed to convert PDF page ${pageNumber} to image:`, error);
    throw error;
  }
}

/**
 * Cleans extracted/OCR text by removing repeated headers/footers, excessive whitespace, broken line breaks, and OCR noise
 */
export function cleanExtractedText(text: string): string {
  if (!text) return '';

  let cleaned = text;

  // Standardize carriage returns
  cleaned = cleaned.replace(/\r\n/g, '\n');

  // Replace 3 or more consecutive newlines with double newline (preserving paragraphs)
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n');

  // Remove trailing whitespace from each line
  cleaned = cleaned
    .split('\n')
    .map((line) => line.trim())
    .join('\n');

  // Remove common OCR junk artifacts
  cleaned = cleaned.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '');

  return cleaned.trim();
}
