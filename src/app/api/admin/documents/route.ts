import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/security/auth-helper';
import { getUserDocuments } from '@/lib/db/documents';

export async function GET() {
  try {
    const isAdmin = await requireAdmin();
    if (!isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    // Pass 'admin' flag to getUserDocuments to bypass RLS/filters
    const documents = await getUserDocuments('admin');
    
    return NextResponse.json({ documents });
  } catch (err: unknown) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
