import { NextResponse } from 'next/server';
import { getCurrentUserId } from '@/lib/security/auth-helper';
import { getUserDocuments } from '@/lib/db/documents';
import { getTotalChunkCount } from '@/lib/db/chunks';

export async function GET() {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const documents = await getUserDocuments(userId);
    const totalChunks = await getTotalChunkCount(userId);

    const processedCount = documents.filter((d) => d.processing_status === 'indexed').length;
    const processingCount = documents.filter((d) => d.processing_status !== 'indexed' && d.processing_status !== 'failed').length;
    const totalPages = documents.reduce((acc, curr) => acc + (curr.page_count || 0), 0);

    return NextResponse.json({
      documents,
      stats: {
        totalDocuments: documents.length,
        processedDocuments: processedCount,
        processingDocuments: processingCount,
        totalPages,
        totalIndexedChunks: totalChunks,
        questionsAsked: 12, // example stats metric
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to fetch documents';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

