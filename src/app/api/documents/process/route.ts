import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserId } from '@/lib/security/auth-helper';
import { getDocumentById } from '@/lib/db/documents';
import { processPDFDocument } from '@/lib/pdf/processor';

export async function POST(req: NextRequest) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { documentId } = await req.json();

    if (!documentId) {
      return NextResponse.json({ error: 'documentId is required' }, { status: 400 });
    }

    const doc = await getDocumentById(documentId, userId);
    if (!doc) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    // Fetch actual PDF buffer
    let buffer: Buffer;
    if (doc.file_url.startsWith('/uploads/')) {
      const fs = require('fs');
      const path = require('path');
      const uploadDir = path.join(process.cwd(), 'public');
      buffer = fs.readFileSync(path.join(uploadDir, doc.file_url));
    } else {
      const { createAdminClient } = require('@/lib/db/supabase-admin');
      const supabase = createAdminClient();
      const { data, error } = await supabase.storage.from('documents').download(doc.file_url);
      if (error || !data) {
        return NextResponse.json({ error: 'Failed to download PDF from storage' }, { status: 500 });
      }
      const arrayBuffer = await data.arrayBuffer();
      buffer = Buffer.from(arrayBuffer);
    }

    const result = await processPDFDocument(
      doc.id,
      userId,
      doc.file_name,
      buffer
    );

    return NextResponse.json({ success: true, result });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Reprocessing failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

