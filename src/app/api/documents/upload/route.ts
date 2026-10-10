import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserId } from '@/lib/security/auth-helper';
import { validatePDFFile } from '@/lib/security/validation';
import { checkRateLimit } from '@/lib/security/rate-limit';
import { createDocumentRecord } from '@/lib/db/documents';
import { processPDFDocument } from '@/lib/pdf/processor';
import { createAdminClient } from '@/lib/db/supabase-admin';

export async function POST(req: NextRequest) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Rate limiting check
    const rate = checkRateLimit(`upload_${userId}`, 10, 60000);
    if (!rate.allowed) {
      return NextResponse.json({ error: 'Rate limit exceeded. Please wait a minute.' }, { status: 429 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No PDF file provided' }, { status: 400 });
    }

    // Validate file
    const val = validatePDFFile({ name: file.name, size: file.size, type: file.type });
    if (!val.valid) {
      return NextResponse.json({ error: val.error }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Verify magic bytes (PDFs start with %PDF-)
    if (buffer.length < 5 || buffer.toString('utf-8', 0, 5) !== '%PDF-') {
      return NextResponse.json({ error: 'Invalid file signature. Only genuine PDF files are allowed.' }, { status: 400 });
    }

    // Sanitize filename to prevent XSS/Path issues
    const safeFileName = file.name.replace(/[^a-zA-Z0-9.\-_ ]/g, '').trim() || 'unnamed_document.pdf';

    // Create a safe storage path
    const storagePath = `${userId}/${Date.now()}_${safeFileName}`;
    let finalFileUrl = storagePath;
    
    // Check if Supabase is properly configured
    const isMockSupabase = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').includes('placeholder');

    if (!isMockSupabase) {
      const supabase = createAdminClient();
      
      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(storagePath, buffer, {
          contentType: 'application/pdf',
          upsert: true
        });
        
      if (uploadError) {
        console.error('Failed to upload PDF to storage:', uploadError);
        return NextResponse.json({ error: 'Storage error. Failed to save PDF.' }, { status: 500 });
      }
    } else {
      // Fallback to local filesystem for development without Supabase Storage
      console.warn('⚠️ Supabase not configured. Falling back to local filesystem storage for PDF.');
      const fs = require('fs');
      const path = require('path');
      const uploadDir = path.join(process.cwd(), 'public', 'uploads');
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      fs.writeFileSync(path.join(uploadDir, safeFileName), buffer);
      finalFileUrl = `/uploads/${safeFileName}`;
    }

    // Create DB record
    const docRecord = await createDocumentRecord({
      user_id: userId,
      file_name: safeFileName,
      file_url: finalFileUrl,
      file_size: file.size,
      page_count: 0,
      processing_status: 'uploading',
      ocr_used: false,
    });

    // Run processing pipeline synchronously to avoid serverless termination
    try {
      await processPDFDocument(
        docRecord.id,
        userId,
        safeFileName,
        buffer
      );
    } catch (err) {
      console.error('Document processing failed:', err);
    }

    return NextResponse.json({
      success: true,
      document: docRecord,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Upload processing failed';
    console.error('Upload route error:', err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

