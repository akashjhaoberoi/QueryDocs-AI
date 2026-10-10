import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserId } from '@/lib/security/auth-helper';
import { getDocumentById } from '@/lib/db/documents';
import { createAdminClient } from '@/lib/db/supabase-admin';

export async function GET(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  try {
    const params = await props.params;
    const { id } = params;
    const userId = await getCurrentUserId();
    
    if (!userId) {
      return new NextResponse('Unauthorized', { status: 401 });
    }
    
    const doc = await getDocumentById(id, userId);
    if (!doc) {
      return new NextResponse('Document not found or unauthorized', { status: 404 });
    }
    
    // file_url now contains the storage path like: 'user_uuid/timestamp_filename.pdf'
    // If it's a legacy document stored locally or we are in mock mode, redirect to the local URL directly
    if (doc.file_url.startsWith('/uploads/')) {
      return NextResponse.redirect(new URL(doc.file_url, req.url));
    }
    
    const supabase = createAdminClient();
    
    // Generate a signed URL valid for 2 hours
    const { data, error } = await supabase.storage.from('documents').createSignedUrl(doc.file_url, 7200);
    
    if (error || !data?.signedUrl) {
      console.error('Error generating signed URL:', error);
      return new NextResponse('Error accessing document storage', { status: 500 });
    }
    
    // Redirect to the signed URL so the browser can handle Range requests natively
    // We add Cache-Control to ensure the browser requests a new URL when it expires
    return NextResponse.redirect(data.signedUrl, {
      headers: {
        'Cache-Control': 'private, max-age=3600'
      }
    });
    
  } catch (error) {
    console.error('PDF fetch error:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
