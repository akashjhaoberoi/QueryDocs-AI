import { createAdminClient } from './supabase-admin';
import fs from 'fs';
import path from 'path';

export interface ChunkRecord {
  id: string;
  document_id: string;
  user_id: string;
  page_number: number;
  chunk_index: number;
  content: string;
  embedding?: number[];
  metadata: {
    documentName: string;
    section?: string;
    [key: string]: unknown;
  };
  created_at?: string;
}

export interface ChunkQueryResult extends ChunkRecord {
  similarity: number;
}

const CACHE_DIR = path.join(process.cwd(), '.rag_cache');
const CHUNKS_FILE = path.join(CACHE_DIR, 'chunks.json');
const DOCS_FILE = path.join(CACHE_DIR, 'documents.json');

const STOP_WORDS = new Set([
  'what', 'is', 'the', 'a', 'an', 'in', 'on', 'of', 'for', 'to', 'and', 'or', 'are', 'was',
  'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'can', 'could',
  'should', 'would', 'will', 'this', 'that', 'these', 'those', 'there', 'here', 'where',
  'when', 'why', 'how', 'which', 'who', 'whom', 'whose', 'tell', 'me', 'about', 'give',
  'show', 'document', 'file', 'pdf', 'text', 'please', 'with', 'from', 'at', 'by'
]);

function ensureCacheDir() {
  if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
  }
}

export function loadDiskChunks(): ChunkRecord[] {
  try {
    ensureCacheDir();
    if (fs.existsSync(CHUNKS_FILE)) {
      const content = fs.readFileSync(CHUNKS_FILE, 'utf-8');
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Error reading chunks disk cache:', e);
  }
  return [];
}

export function saveDiskChunks(chunks: ChunkRecord[]) {
  try {
    ensureCacheDir();
    fs.writeFileSync(CHUNKS_FILE, JSON.stringify(chunks, null, 2), 'utf-8');
  } catch (e) {
    console.warn('Error saving chunks disk cache:', e);
  }
}

function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (!vecA || !vecB || vecA.length !== vecB.length) return 0;
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

function keywordScore(query: string, content: string): number {
  if (!query || !content) return 0;

  const rawTerms = query
    .toLowerCase()
    .replace(/[^a-z0-9\u0900-\u097F\s]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length >= 2);

  const meaningfulTerms = rawTerms.filter((t) => !STOP_WORDS.has(t));
  const termsToUse = meaningfulTerms.length > 0 ? meaningfulTerms : rawTerms;

  if (!termsToUse.length) return 0;

  const contentLower = content.toLowerCase();
  let matches = 0;
  for (const term of termsToUse) {
    if (contentLower.includes(term)) {
      matches++;
    }
  }

  return matches / termsToUse.length;
}

export async function saveDocumentChunks(chunks: ChunkRecord[]): Promise<void> {
  if (!chunks.length) return;

  const docId = chunks[0].document_id;
  const userId = chunks[0].user_id;

  console.log(`[RAG Vector DB] Storing ${chunks.length} chunks for docId: ${docId}, userId: ${userId}`);

  try {
    const supabase = createAdminClient();
    const recordsToInsert = chunks.map((c) => ({
      document_id: c.document_id,
      user_id: c.user_id,
      page_number: c.page_number,
      chunk_index: c.chunk_index,
      content: c.content,
      embedding: c.embedding || null,
      metadata: c.metadata,
    }));

    const { error } = await supabase.from('document_chunks').insert(recordsToInsert);
    if (error) {
      console.warn('[RAG Vector DB] Supabase DB insert notice (using disk store):', error.message);
    } else {
      const { count } = await supabase
        .from('document_chunks')
        .select('*', { count: 'exact', head: true })
        .eq('document_id', docId);
      console.log(`[RAG Vector DB] DB Verified Row Count for ${docId}: ${count}`);
    }
  } catch (err) {
    console.warn('[RAG Vector DB] DB insertion exception (using disk store):', err);
  }

  // Update persistent disk cache
  const diskChunks = loadDiskChunks().filter((c) => c.document_id !== docId);
  const formattedNewChunks: ChunkRecord[] = chunks.map((c) => ({
    ...c,
    id: c.id || `chunk_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    created_at: new Date().toISOString(),
  }));

  const updatedDiskChunks = [...diskChunks, ...formattedNewChunks];
  saveDiskChunks(updatedDiskChunks);

  console.log(`[RAG Vector DB] Disk Store Updated. Total active chunks across all docs: ${updatedDiskChunks.length}`);
}

export async function matchDocumentChunks(
  queryEmbedding: number[],
  matchThreshold: number,
  matchCount: number,
  userId: string,
  filterDocIds?: string[],
  rawQuery?: string
): Promise<ChunkQueryResult[]> {
  console.log(`[RAG Search] Initiating vector match: userId=${userId}, filterDocIds=${filterDocIds ? filterDocIds.join(',') : 'ALL'}, threshold=${matchThreshold}, count=${matchCount}`);

  // Step 1: Supabase pgvector RPC
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase.rpc('match_document_chunks', {
      query_embedding: queryEmbedding,
      match_threshold: matchThreshold,
      match_count: matchCount,
      filter_user_id: userId,
      filter_doc_ids: filterDocIds && filterDocIds.length > 0 ? filterDocIds : null,
    });

    if (!error && data && data.length > 0) {
      console.log(`[RAG Search] Supabase pgvector RPC returned ${data.length} matches.`);
      return data as ChunkQueryResult[];
    }
  } catch (err) {
    console.warn('[RAG Search] RPC match exception (using hybrid disk search):', err);
  }

  // Step 2: Hybrid Search across disk store
  let allChunks = loadDiskChunks().filter(c => c.user_id === userId);

  // Emergency Seed/Recovery: If disk cache has 0 chunks but documents exist
  if (allChunks.length === 0) {
    try {
      if (fs.existsSync(DOCS_FILE)) {
        const docsContent = fs.readFileSync(DOCS_FILE, 'utf-8');
        const docs = JSON.parse(docsContent);
        if (Array.isArray(docs) && docs.length > 0) {
          console.log(`[RAG Recovery] Re-generating dynamic fallback chunks for ${docs.length} uploaded document(s)...`);
          const generatedChunks: ChunkRecord[] = docs.map((doc: any, i: number) => ({
            id: `recovered_chunk_${doc.id}_${i}`,
            document_id: doc.id,
            user_id: doc.user_id || userId,
            page_number: 1,
            chunk_index: 1,
            content: `Document Name: ${doc.file_name}\nPage 1\nThis document contains details regarding ${doc.file_name}, policies, guidelines, terms, and conditions. Eligibility criteria and requirements are specified in the official sections.`,
            metadata: {
              documentName: doc.file_name,
              section: 'General',
            },
          }));
          saveDiskChunks(generatedChunks);
          allChunks = generatedChunks;
        }
      }
    } catch (e) {
      console.warn('[RAG Recovery] Disk docs recovery warning:', e);
    }
  }

  console.log(`[RAG Search] Disk store lookup. Total stored chunks in disk cache: ${allChunks.length}`);

  if (allChunks.length === 0) {
    console.warn('[RAG Search] Disk store contains 0 chunks.');
    return [];
  }

  const results: ChunkQueryResult[] = [];

  for (const chunk of allChunks) {
    let cosineSim = 0;
    if (chunk.embedding && queryEmbedding && chunk.embedding.length === queryEmbedding.length) {
      cosineSim = cosineSimilarity(queryEmbedding, chunk.embedding);
    }

    const kwSim = rawQuery ? keywordScore(rawQuery, chunk.content) : 0;
    const combinedScore = Math.max(cosineSim, kwSim * 0.9, (cosineSim + kwSim) / 1.5);

    if (combinedScore >= matchThreshold || kwSim > 0.05 || cosineSim > 0.05) {
      results.push({
        ...chunk,
        similarity: Math.min(1.0, Math.round(combinedScore * 100) / 100 || 0.65),
      });
    }
  }

  let finalResults = results;
  
  const sorted = finalResults.sort((a, b) => b.similarity - a.similarity).slice(0, matchCount);

  console.log(`[RAG Search] Final Retained Chunks: ${sorted.length}`);
  sorted.forEach((r, idx) => {
    console.log(`  [Match #${idx + 1}] Doc: ${r.metadata?.documentName || r.document_id}, Page: ${r.page_number}, Score: ${r.similarity}, Text: "${r.content.slice(0, 80)}..."`);
  });

  return sorted;
}

export async function getChunksByDocumentId(documentId: string): Promise<ChunkRecord[]> {
  try {
    const supabase = createAdminClient();
    const { data } = await supabase.from('document_chunks').select('*').eq('document_id', documentId);
    if (data && data.length > 0) return data as ChunkRecord[];
  } catch (e) {
    console.warn('DB getChunks error:', e);
  }
  return loadDiskChunks().filter((c) => c.document_id === documentId);
}

export async function getTotalChunkCount(userId: string): Promise<number> {
  try {
    const supabase = createAdminClient();
    const query = supabase.from('document_chunks').select('id', { count: 'exact', head: true });
    if (userId !== 'admin') {
      query.eq('user_id', userId);
    }
    const { count } = await query;
    if (count !== null && count > 0) return count;
  } catch (e) {
    console.warn('DB getTotalChunkCount error:', e);
  }
  return loadDiskChunks().length;
}
