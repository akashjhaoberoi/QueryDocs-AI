import { generateEmbedding } from '../ai/embeddings';
import { matchDocumentChunks, ChunkQueryResult } from '../db/chunks';

export interface SearchOptions {
  topK?: number;
  similarityThreshold?: number;
  documentIds?: string[];
}

/**
 * Performs vector similarity search for a given natural language query
 */
export async function retrieveRelevantChunks(
  query: string,
  userId: string,
  options: SearchOptions = {}
): Promise<ChunkQueryResult[]> {
  const topK = options.topK || parseInt(process.env.TOP_K_RESULTS || '5', 10);
  const similarityThreshold = options.similarityThreshold !== undefined 
    ? options.similarityThreshold 
    : parseFloat(process.env.SIMILARITY_THRESHOLD || '0.25');

  console.log(`\n--------------------------------------------------`);
  console.log(`[RAG Retrieval] Query: "${query}" | userId: ${userId} | docFilter: ${options.documentIds ? options.documentIds.join(',') : 'ALL'} | Threshold: ${similarityThreshold} | TopK: ${topK}`);

  // Generate vector embedding for user query
  const queryEmbedding = await generateEmbedding(query);
  const queryEmbeddingDim = queryEmbedding ? queryEmbedding.length : 0;

  console.log(`[RAG Retrieval] Question Embedding Generated. Model: ${process.env.EMBEDDING_PROVIDER || 'openai'}, Dimension: ${queryEmbeddingDim}`);

  // Execute match
  const matches = await matchDocumentChunks(
    queryEmbedding,
    similarityThreshold,
    topK,
    userId,
    options.documentIds,
    query
  );

  console.log(`[RAG Retrieval] Matches returned: ${matches.length}`);
  return matches;
}
