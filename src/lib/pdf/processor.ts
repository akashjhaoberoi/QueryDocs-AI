import { parseNativePDF, isPageScanned } from './parser';
import { runOCR, cleanExtractedText, convertPdfPageToImage } from './ocr';
import { chunkDocumentPages } from '../rag/chunking';
import { generateEmbedding } from '../ai/embeddings';
import { updateDocumentStatus, saveDocumentPages } from '../db/documents';
import { saveDocumentChunks, ChunkRecord } from '../db/chunks';

export interface ProcessPDFResult {
  success: boolean;
  pageCount: number;
  chunkCount: number;
  ocrUsed: boolean;
  extractedCharacterCount: number;
  error?: string;
}

/**
 * Complete PDF Processing Pipeline with full diagnostic logging:
 * Upload -> Validate -> Extract Text -> Check Scanned -> OCR (if scanned) -> Clean -> Chunk -> Embed -> Save Vector Store
 */
export async function processPDFDocument(
  documentId: string,
  userId: string,
  documentName: string,
  pdfBuffer: Buffer
): Promise<ProcessPDFResult> {
  console.log(`\n==================================================`);
  console.log(`[RAG Pipeline] Processing documentId: ${documentId}, userId: ${userId}, file: "${documentName}", size: ${pdfBuffer.length} bytes`);
  console.log(`==================================================`);

  try {
    // Step 1: Update status
    await updateDocumentStatus(documentId, 'extracting');

    // Step 2: Native PDF text extraction
    const nativeResult = await parseNativePDF(pdfBuffer);
    const pageCount = nativeResult.pageCount || 1;
    let extractedCharacterCount = nativeResult.extractedCharacterCount || 0;

    console.log(`[RAG Pipeline Step 2] Native text extraction completed. Total extracted characters: ${extractedCharacterCount}, Total pages: ${pageCount}`);

    let ocrUsed = false;
    const processedPages: Array<{
      document_id: string;
      page_number: number;
      extracted_text: string;
      is_ocr: boolean;
      confidence: number;
    }> = [];

    const chunkInputs: Array<{
      documentId: string;
      userId: string;
      documentName: string;
      pageNumber: number;
      text: string;
    }> = [];

    // Step 3: Page-by-page inspection & OCR if scanned or insufficient text
    let pagesProcessed = 0;
    for (const page of nativeResult.pages) {
      pagesProcessed++;
      const pageText = page.text || '';
      const scanned = isPageScanned(pageText); // || extractedCharacterCount < 100;

      let finalPageText = cleanExtractedText(pageText);
      let pageIsOcr = false;
      let pageConfidence = 1.0;

      if (scanned) {
        console.log(`[RAG Pipeline Step 3] Page ${page.pageNumber} classified as scanned/insufficient text. Executing Tesseract OCR...`);
        await updateDocumentStatus(documentId, 'ocr');
        ocrUsed = true;
        pageIsOcr = true;

        try {
          // 1. Convert page to PNG image
          const pageImageBuffer = await convertPdfPageToImage(pdfBuffer, page.pageNumber);
          
          // 2. Run OCR with timeout
          const OCR_TIMEOUT_MS = 60000; // 60 seconds per page timeout
          let timeoutId: NodeJS.Timeout;
          const timeoutPromise = new Promise<never>((_, reject) => {
            timeoutId = setTimeout(() => reject(new Error(`OCR timed out after ${OCR_TIMEOUT_MS}ms`)), OCR_TIMEOUT_MS);
          });
          
          try {
            const ocrRes = await Promise.race([
              runOCR(pageImageBuffer),
              timeoutPromise
            ]);
            clearTimeout(timeoutId!);
          
            if (ocrRes && ocrRes.text) {
              finalPageText = cleanExtractedText(ocrRes.text);
              pageConfidence = ocrRes.confidence;
              console.log(`[RAG Pipeline Step 3] OCR page ${page.pageNumber} successful. Extracted ${finalPageText.length} characters (confidence: ${pageConfidence}).`);
            }
          } finally {
            clearTimeout(timeoutId!);
          }
        } catch (pageErr) {
          console.error(`[RAG Pipeline Failure] OCR failed on page ${page.pageNumber}:`, pageErr);
          throw new Error(`OCR processing failed on page ${page.pageNumber}: ${pageErr instanceof Error ? pageErr.message : String(pageErr)}`);
        }
      }

      processedPages.push({
        document_id: documentId,
        page_number: page.pageNumber,
        extracted_text: finalPageText,
        is_ocr: pageIsOcr,
        confidence: pageConfidence,
      });

      if (finalPageText) {
        chunkInputs.push({
          documentId,
          userId,
          documentName,
          pageNumber: page.pageNumber,
          text: finalPageText,
        });
      }
    }

    // Save page records
    await saveDocumentPages(processedPages);

    // Step 4: Chunking
    await updateDocumentStatus(documentId, 'processing');
    const smartChunks = chunkDocumentPages(chunkInputs);
    const chunkCount = smartChunks.length;

    console.log(`[RAG Pipeline Step 4] Chunking completed. Pages processed: ${pagesProcessed}, Chunks created: ${chunkCount}`);
    if (chunkCount > 0) {
      console.log(`[RAG Pipeline Step 4] First Chunk Sample (id: ${smartChunks[0].chunkId}): "${smartChunks[0].text.slice(0, 100)}..."`);
    }

    // Step 5: Embeddings Generation & Vector Insertion
    await updateDocumentStatus(documentId, 'embedding');

    const vectorChunks: ChunkRecord[] = [];
    let embeddingsGenerated = 0;

    for (const chunk of smartChunks) {
      const embedding = await generateEmbedding(chunk.text);
      embeddingsGenerated++;
      vectorChunks.push({
        id: chunk.chunkId,
        document_id: documentId,
        user_id: userId,
        page_number: chunk.pageNumber,
        chunk_index: chunk.chunkIndex,
        content: chunk.text,
        embedding,
        metadata: {
          documentName: chunk.metadata.documentName,
          section: chunk.metadata.section,
        },
      });
    }

    console.log(`[RAG Pipeline Step 5] Embeddings generated: ${embeddingsGenerated} (dim: ${vectorChunks[0]?.embedding?.length || 1536})`);

    // Step 6: Store vectors
    await saveDocumentChunks(vectorChunks);

    await updateDocumentStatus(documentId, 'indexed', {
      page_count: pageCount,
      ocr_used: ocrUsed,
    });

    console.log(`[RAG Pipeline Complete] Document ${documentId} ("${documentName}") successfully indexed! Total pages: ${pageCount}, Chunks: ${chunkCount}, Embeddings: ${embeddingsGenerated}, OCR used: ${ocrUsed}\n`);

    return {
      success: true,
      pageCount,
      chunkCount,
      ocrUsed,
      extractedCharacterCount,
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown processing error';
    console.error(`[RAG Pipeline Failure] Document processing failed for ${documentId}:`, err);
    await updateDocumentStatus(documentId, 'failed', { error_message: errorMsg });
    return {
      success: false,
      pageCount: 0,
      chunkCount: 0,
      ocrUsed: false,
      extractedCharacterCount: 0,
      error: errorMsg,
    };
  }
}
