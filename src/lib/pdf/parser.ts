export interface PageExtract {
  pageNumber: number;
  text: string;
  isScanned: boolean;
  confidence?: number;
}

export interface PDFParseResult {
  pageCount: number;
  pages: PageExtract[];
  text: string;
  extractedCharacterCount: number;
  info?: Record<string, unknown>;
}

/**
 * Extracts native text page-by-page from a PDF Buffer
 */
export async function parseNativePDF(pdfBuffer: Buffer): Promise<PDFParseResult> {
  const pageExtracts: PageExtract[] = [];
  let currentPage = 1;
  let totalText = '';

  const renderPage = (pageData: { getTextContent: () => Promise<{ items: Array<{ str: string }> }> }) => {
    return pageData.getTextContent().then((textContent) => {
      let pageText = '';
      for (const item of textContent.items) {
        pageText += item.str + ' ';
      }

      const trimmedPageText = pageText.trim();
      totalText += trimmedPageText + ' ';

      pageExtracts.push({
        pageNumber: currentPage,
        text: trimmedPageText,
        isScanned: false,
      });

      currentPage++;
      return pageText;
    });
  };

  try {
    const pdfParseModule = await import('pdf-parse');
    const PDFParseClass = pdfParseModule.PDFParse;
    
    if (PDFParseClass) {
      const parser = new PDFParseClass({ data: pdfBuffer });
      const result = await parser.getText();
      const infoResult = await parser.getInfo();
      await parser.destroy();
      
      const fullText = (result.text || '').trim();
      const charCount = fullText.length;
      
      console.log(`[RAG Extraction Pipeline] Native PDF parsed: pageCount=${result.pages?.length || 1}, extractedCharacterCount=${charCount}`);

      return {
        pageCount: result.pages?.length || 1,
        pages: (result.pages || []).map((p: any, i: number) => ({
          pageNumber: i + 1,
          text: (p.text || '').trim(),
          isScanned: false
        })),
        text: fullText,
        extractedCharacterCount: charCount,
        info: infoResult?.info as Record<string, unknown> | undefined,
      };
    }
  } catch (err) {
    console.warn('[RAG Extraction Pipeline] Native PDF parsing exception, returning fallback for OCR:', err);
  }

  return {
    pageCount: 1,
    pages: [{ pageNumber: 1, text: '', isScanned: true }],
    text: '',
    extractedCharacterCount: 0,
  };
}

/**
 * Evaluates extracted page text quality.
 * If page text has fewer than 50 readable characters or appears empty, classify it as scanned.
 */
export function isPageScanned(text: string): boolean {
  // Clean text and check length to decide if it's scanned
  const cleanedText = text.replace(/\s+/g, '').trim();
  return cleanedText.length < 50;
}
