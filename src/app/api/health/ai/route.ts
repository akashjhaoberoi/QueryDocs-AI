import { NextResponse } from 'next/server';
import { getAIConfig } from '@/lib/ai/config';
import { generateChatCompletion } from '@/lib/ai/provider';

export async function GET() {
  try {
    const config = getAIConfig();

    let testStatus = 'Not configured';
    let testLatencyMs = 0;

    if (config.isLlmConfigured) {
      const startTime = Date.now();
      try {
        const testResult = await generateChatCompletion(
          'System test',
          'Respond with the word OK.',
          false
        );
        const text = typeof testResult === 'string' ? testResult.trim() : 'OK';
        testStatus = text.includes('OK') || text.length > 0 ? 'Connected' : 'Unexpected response';
        testLatencyMs = Date.now() - startTime;
      } catch (err: any) {
        testStatus = `Connection failed: ${err?.message || 'Unknown error'}`;
      }
    }

    return NextResponse.json({
      provider: config.provider,
      configured: config.isLlmConfigured,
      embeddingProvider: config.embeddingProvider,
      embeddingConfigured: config.isEmbeddingConfigured,
      models: {
        llm: config.provider === 'openai' ? config.openaiModel : config.geminiModel,
        embedding: config.embeddingProvider === 'openai' ? config.openaiEmbeddingModel : config.geminiEmbeddingModel,
      },
      connectionTest: {
        status: testStatus,
        latencyMs: testLatencyMs,
      },
      error: config.error || null,
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        provider: 'unknown',
        configured: false,
        error: err?.message || 'Health check failed',
      },
      { status: 500 }
    );
  }
}
