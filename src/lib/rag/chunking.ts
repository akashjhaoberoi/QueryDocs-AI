export interface ChunkInput {
  documentId: string;
  userId: string;
  documentName: string;
  pageNumber: number;
  text: string;
}

export interface SmartChunk {
  chunkId: string;
  documentId: string;
  userId: string;
  pageNumber: number;
  chunkIndex: number;
  text: string;
  metadata: {
    documentName: string;
    section?: string;
    tokenEstimate: number;
  };
}

export interface ChunkingOptions {
  chunkSize?: number; // Target character length (~1000 chars ≈ 800-1000 tokens)
  overlap?: number;    // Overlap length (~150 chars ≈ 100-150 tokens)
}

/**
 * Splits document page text into semantically cohesive chunks preferring paragraph, heading, and sentence boundaries.
 */
export function chunkDocumentPages(
  inputs: ChunkInput[],
  options: ChunkingOptions = {}
): SmartChunk[] {
  const chunkSize = options.chunkSize || parseInt(process.env.DEFAULT_CHUNK_SIZE || '1000', 10);
  const overlap = options.overlap || parseInt(process.env.DEFAULT_CHUNK_OVERLAP || '150', 10);

  const chunks: SmartChunk[] = [];
  let globalChunkIndex = 0;

  for (const pageInput of inputs) {
    const pageText = pageInput.text.trim();
    if (!pageText) continue;

    // Split page text into paragraphs
    const paragraphs = pageText.split(/\n\s*\n/);
    let currentChunkText = '';
    let currentSection = 'General';

    for (const paragraph of paragraphs) {
      const cleanPara = paragraph.trim();
      if (!cleanPara) continue;

      // Check if paragraph looks like a section heading
      if (cleanPara.length < 80 && /^[A-Z0-9\s.:#-]+$/i.test(cleanPara)) {
        currentSection = cleanPara;
      }

      // If adding this paragraph exceeds target chunk size, commit current chunk
      if (currentChunkText.length + cleanPara.length > chunkSize && currentChunkText.length > 0) {
        globalChunkIndex++;
        chunks.push({
          chunkId: `chk_${pageInput.documentId}_${globalChunkIndex}`,
          documentId: pageInput.documentId,
          userId: pageInput.userId,
          pageNumber: pageInput.pageNumber,
          chunkIndex: globalChunkIndex,
          text: currentChunkText.trim(),
          metadata: {
            documentName: pageInput.documentName,
            section: currentSection,
            tokenEstimate: Math.ceil(currentChunkText.length / 4),
          },
        });

        // Retain overlap tail for continuity
        const tail = currentChunkText.slice(Math.max(0, currentChunkText.length - overlap));
        currentChunkText = tail + '\n' + cleanPara;
      } else {
        currentChunkText = currentChunkText ? `${currentChunkText}\n\n${cleanPara}` : cleanPara;
      }
    }

    // Flush remaining text on page
    if (currentChunkText.trim().length > 0) {
      globalChunkIndex++;
      chunks.push({
        chunkId: `chk_${pageInput.documentId}_${globalChunkIndex}`,
        documentId: pageInput.documentId,
        userId: pageInput.userId,
        pageNumber: pageInput.pageNumber,
        chunkIndex: globalChunkIndex,
        text: currentChunkText.trim(),
        metadata: {
          documentName: pageInput.documentName,
          section: currentSection,
          tokenEstimate: Math.ceil(currentChunkText.length / 4),
        },
      });
    }
  }

  return chunks;
}
