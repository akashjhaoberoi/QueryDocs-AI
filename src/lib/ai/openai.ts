import OpenAI from 'openai';
import { getAIConfig } from './config';

export function getOpenAIClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey || apiKey.length < 5 || apiKey.includes('your-openai')) {
    const err = new Error('OpenAI API key is not configured. Please set OPENAI_API_KEY in environment variables.');
    (err as any).code = 'AI_PROVIDER_NOT_CONFIGURED';
    throw err;
  }
  return new OpenAI({ apiKey });
}

export async function generateOpenAIEmbedding(text: string): Promise<number[]> {
  const openai = getOpenAIClient();
  const config = getAIConfig();

  try {
    const response = await openai.embeddings.create({
      model: config.openaiEmbeddingModel,
      input: text.replace(/\n/g, ' '),
      dimensions: 1536,
    });

    return response.data[0].embedding;
  } catch (err: any) {
    console.error('OpenAI Embedding Error:', err);
    throw new Error(`OpenAI Embedding failed: ${err?.message || 'Unknown error'}`);
  }
}

export async function generateOpenAIChatCompletion(
  systemPrompt: string,
  userPrompt: string,
  stream: boolean = false
): Promise<string | ReadableStream> {
  const openai = getOpenAIClient();
  const config = getAIConfig();

  try {
    if (stream) {
      const response = await openai.chat.completions.create({
        model: config.openaiModel,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.1,
        stream: true,
      });

      const encoder = new TextEncoder();
      return new ReadableStream({
        async start(controller) {
          try {
            for await (const chunk of response) {
              const content = chunk.choices[0]?.delta?.content || '';
              if (content) {
                controller.enqueue(encoder.encode(content));
              }
            }
            controller.close();
          } catch (err) {
            controller.error(err);
          }
        },
      });
    }

    const response = await openai.chat.completions.create({
      model: config.openaiModel,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.1,
    });

    return response.choices[0]?.message?.content || '';
  } catch (err: any) {
    console.error('OpenAI Completion Error:', err);
    const errorMsg = err?.message || 'Failed to generate answer from OpenAI.';
    const genErr = new Error(`AI_GENERATION_FAILED: ${errorMsg}`);
    (genErr as any).code = 'AI_GENERATION_FAILED';
    throw genErr;
  }
}
