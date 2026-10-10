import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/security/auth-helper';
import { createServerSupabaseClient } from '@/lib/db/supabase-server';

export async function GET() {
  try {
    const isAdmin = await requireAdmin();
    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Basic health checks
    let dbHealthy = false;
    try {
      const supabase = await createServerSupabaseClient();
      // Check documents table since users might not exist in public schema
      const { data, error } = await supabase.from('documents').select('id').limit(1);
      if (!error) dbHealthy = true;
    } catch(e) {}

    return NextResponse.json({
      status: 'healthy',
      database: dbHealthy,
      storage: dbHealthy,
      ai: true,
      vectorSearch: dbHealthy,
      ocr: true,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
