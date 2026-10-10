import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserId } from '@/lib/security/auth-helper';
import { retrieveRelevantChunks } from '@/lib/rag/retrieval';

export async function POST(req: NextRequest) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { query, documentIds = [], topK = 5 } = await req.json();

    if (!query) {
      return NextResponse.json({ error: 'Query string is required' }, { status: 400 });
    }

    const chunks = await retrieveRelevantChunks(query, userId, {
      documentIds,
      topK,
    });

    return NextResponse.json({
      query,
      resultsCount: chunks.length,
      chunks,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Search failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

