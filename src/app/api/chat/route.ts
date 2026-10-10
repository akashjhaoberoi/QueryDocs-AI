import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserId } from '@/lib/security/auth-helper';
import { checkRateLimit } from '@/lib/security/rate-limit';
import { generateGroundedAnswer } from '@/lib/rag/answer';
import { createConversation, addMessageToConversation } from '@/lib/db/conversations';
import { getAIConfig } from '@/lib/ai/config';

export async function POST(req: NextRequest) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const rate = checkRateLimit(`chat_${userId}`, 30, 60000);
    if (!rate.allowed) {
      return NextResponse.json({ error: 'RATE_LIMIT_EXCEEDED', message: 'Rate limit exceeded. Please wait a minute.' }, { status: 429 });
    }

    // Verify AI Configuration server-side
    const config = getAIConfig();
    if (!config.isLlmConfigured) {
      return NextResponse.json(
        {
          error: 'AI_PROVIDER_NOT_CONFIGURED',
          message: config.error || `AI service is not configured. Please configure an LLM API key for ${config.provider.toUpperCase()}.`,
          provider: config.provider,
        },
        { status: 503 }
      );
    }

    const body = await req.json();
    const { message, conversationId: reqConvId, documentIds = [] } = body;

    if (!message || typeof message !== 'string' || !message.trim()) {
      return NextResponse.json({ error: 'INVALID_INPUT', message: 'Question message cannot be empty' }, { status: 400 });
    }

    let activeConvId = reqConvId;
    if (!activeConvId) {
      const conv = await createConversation(userId, message.slice(0, 40), documentIds);
      activeConvId = conv.id;
    }

    // Save user message
    await addMessageToConversation(activeConvId, userId, 'user', message);

    // Generate RAG Grounded Answer
    const answerRes = await generateGroundedAnswer(message, userId, {
      documentIds,
      stream: true,
    });

    const citationsJson = JSON.stringify(answerRes.citations);

    // Stream response tokens
    if (answerRes.answerStream) {
      const reader = answerRes.answerStream.getReader();
      const encoder = new TextEncoder();
      let accumulatedText = '';

      const responseStream = new ReadableStream({
        async start(controller) {
          const metaPayload = JSON.stringify({
            conversationId: activeConvId,
            citations: answerRes.citations,
            type: 'meta',
          }) + '\n---META_END---\n';
          controller.enqueue(encoder.encode(metaPayload));

          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              accumulatedText += new TextDecoder().decode(value);
              controller.enqueue(value);
            }
          } catch (err) {
            console.error('Stream reading error:', err);
          } finally {
            await addMessageToConversation(
              activeConvId,
              userId,
              'assistant',
              accumulatedText || "I couldn't find this information in the uploaded documents.",
              answerRes.citations
            );
            controller.close();
          }
        },
      });

      return new NextResponse(responseStream, {
        headers: {
          'Content-Type': 'text/event-stream; charset=utf-8',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
          'X-Conversation-Id': activeConvId,
          'X-Citations': encodeURIComponent(citationsJson),
        },
      });
    }

    const assistantText = answerRes.answerText || "I couldn't find this information in the uploaded documents.";
    await addMessageToConversation(activeConvId, userId, 'assistant', assistantText, answerRes.citations);

    return NextResponse.json({
      conversationId: activeConvId,
      answer: assistantText,
      citations: answerRes.citations,
    });
  } catch (err: any) {
    console.error('Chat API Error:', err);
    const code = err?.code || 'AI_GENERATION_FAILED';
    const message = err?.message || 'The AI service could not generate an answer.';
    return NextResponse.json({ error: code, message }, { status: err?.code === 'AI_PROVIDER_NOT_CONFIGURED' ? 503 : 500 });
  }
}

