import { NextRequest, NextResponse } from 'next/server';
import { runOCR } from '@/lib/pdf/ocr';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No image or PDF file provided' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const ocrResult = await runOCR(buffer);

    return NextResponse.json({
      text: ocrResult.text,
      confidence: ocrResult.confidence,
      language: ocrResult.language,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'OCR failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
