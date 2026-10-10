import { ChunkQueryResult } from '../db/chunks';

/**
 * Optional lightweight keyword & term frequency re-ranker to boost relevant chunks
 */
export function rerankChunks(query: string, chunks: ChunkQueryResult[]): ChunkQueryResult[] {
  if (!chunks.length) return [];

  const queryTerms = query
    .toLowerCase()
    .replace(/[^a-z0-9\u0900-\u097F\s]/g, '')
    .split(/\s+/)
    .filter((t) => t.length > 2);

  if (!queryTerms.length) return chunks;

  const scored = chunks.map((chunk) => {
    const textLower = chunk.content.toLowerCase();
    let termMatchCount = 0;

    for (const term of queryTerms) {
      if (textLower.includes(term)) {
        termMatchCount++;
      }
    }

    const keywordBoost = (termMatchCount / queryTerms.length) * 0.15;
    const finalScore = Math.min(1.0, chunk.similarity + keywordBoost);

    return {
      ...chunk,
      similarity: finalScore,
    };
  });

  return scored.sort((a, b) => b.similarity - a.similarity);
}
