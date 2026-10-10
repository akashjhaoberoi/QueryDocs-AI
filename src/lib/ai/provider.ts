import { generateOpenAIChatCompletion } from './openai';
import { generateGeminiChatCompletion } from './gemini';
import { assertLLMConfigured } from './config';

export type AIProvider = 'openai' | 'gemini';

export async function generateChatCompletion(
  systemPrompt: string,
  userPrompt: string,
  stream: boolean = false
): Promise<string | ReadableStream> {
  // Validate configuration server-side. Throws AI_PROVIDER_NOT_CONFIGURED if API key is missing.
  const config = assertLLMConfigured();

  if (config.provider === 'gemini') {
    return await generateGeminiChatCompletion(systemPrompt, userPrompt, stream);
  }

  // Default to OpenAI
  return await generateOpenAIChatCompletion(systemPrompt, userPrompt, stream);
}
