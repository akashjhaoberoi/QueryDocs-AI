import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserId } from '@/lib/security/auth-helper';
import { getUserConversations, createConversation } from '@/lib/db/conversations';

export async function GET() {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const conversations = await getUserConversations(userId);
    return NextResponse.json({ conversations });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error listing conversations';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { title = 'New Chat', documentIds = [] } = await req.json().catch(() => ({}));
    const conv = await createConversation(userId, title, documentIds);
    return NextResponse.json({ conversation: conv });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error creating conversation';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

