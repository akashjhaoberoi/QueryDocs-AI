import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserId } from '@/lib/security/auth-helper';
import { getDocumentById, deleteDocument } from '@/lib/db/documents';
import { getChunksByDocumentId } from '@/lib/db/chunks';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const userId = await getCurrentUserId();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const document = await getDocumentById(id, userId);

    if (!document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    const chunks = await getChunksByDocumentId(id);

    return NextResponse.json({
      document,
      chunks,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error fetching document';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const userId = await getCurrentUserId();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const success = await deleteDocument(id, userId);

    return NextResponse.json({ success });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error deleting document';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
