import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/security/auth-helper';
import { deleteDocument } from '@/lib/db/documents';

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const isAdmin = await requireAdmin();
    if (!isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    await deleteDocument(id, 'admin');
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
