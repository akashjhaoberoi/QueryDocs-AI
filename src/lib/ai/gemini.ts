import { GoogleGenerativeAI } from '@google/generative-ai';
import { getAIConfig } from './config';

export function getGeminiClient(): GoogleGenerativeAI {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey || apiKey.length < 5 || apiKey.includes('your-gemini')) {
    const err = new Error('Gemini API key is not configured. Please set GEMINI_API_KEY in environment variables.');
    (err as any).code = 'AI_PROVIDER_NOT_CONFIGURED';
    throw err;
  }
  return new GoogleGenerativeAI(apiKey);
}

export async function generateGeminiEmbedding(text: string): Promise<number[]> {
  const ai = getGeminiClient();
  const config = getAIConfig();

  try {
    const model = ai.getGenerativeModel({ model: config.geminiEmbeddingModel });
    const result = await model.embedContent(text);
    const values = result.embedding.values;

    const targetDim = 1536;
    if (values.length === targetDim) return values;
    if (values.length > targetDim) return values.slice(0, targetDim);

    const padded = new Array(targetDim).fill(0);
    for (let i = 0; i < values.length; i++) {
      padded[i] = values[i];
    }
    return padded;
  } catch (err: any) {
    console.error('Gemini Embedding Error:', err);
    throw new Error(`Gemini Embedding failed: ${err?.message || 'Unknown error'}`);
  }
}

export async function generateGeminiChatCompletion(
  systemPrompt: string,
  userPrompt: string,
  stream: boolean = false
): Promise<string | ReadableStream> {
  const ai = getGeminiClient();
  const config = getAIConfig();

  try {
    const model = ai.getGenerativeModel({
      model: config.geminiModel,
      systemInstruction: systemPrompt,
    });

    if (stream) {
      const responseStream = await model.generateContentStream(userPrompt);
      const encoder = new TextEncoder();

      return new ReadableStream({
        async start(controller) {
          try {
            for await (const chunk of responseStream.stream) {
              const text = chunk.text();
              if (text) {
                controller.enqueue(encoder.encode(text));
              }
            }
            controller.close();
          } catch (err) {
            controller.error(err);
          }
        },
      });
    }

    const result = await model.generateContent(userPrompt);
    return result.response.text();
  } catch (err: any) {
    const errorMsg = err?.message || 'Failed to generate answer from Gemini.';
    const genErr = new Error(`AI_GENERATION_FAILED: ${errorMsg}`);
    (genErr as any).code = 'AI_GENERATION_FAILED';
    throw genErr;
  }
}
