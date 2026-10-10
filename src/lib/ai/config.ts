export interface AIConfig {
  provider: 'openai' | 'gemini';
  isLlmConfigured: boolean;
  isEmbeddingConfigured: boolean;
  embeddingProvider: 'openai' | 'gemini';
  openaiModel: string;
  openaiEmbeddingModel: string;
  geminiModel: string;
  geminiEmbeddingModel: string;
  error?: string;
}

/**
 * Server-side AI configuration validator.
 * Ensures API keys and providers are accessed exclusively on the server side.
 */
export function getAIConfig(): AIConfig {
  const providerRaw = (process.env.LLM_PROVIDER || 'openai').toLowerCase().trim();
  const provider = (providerRaw === 'gemini' ? 'gemini' : 'openai') as 'openai' | 'gemini';

  const embeddingProviderRaw = (process.env.EMBEDDING_PROVIDER || provider).toLowerCase().trim();
  const embeddingProvider = (embeddingProviderRaw === 'gemini' ? 'gemini' : 'openai') as 'openai' | 'gemini';

  const openaiKey = process.env.OPENAI_API_KEY?.trim();
  const geminiKey = process.env.GEMINI_API_KEY?.trim();

  const openaiModel = process.env.OPENAI_MODEL || 'gpt-4o-mini';
  const openaiEmbeddingModel = process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-small';

  const geminiModel = process.env.GEMINI_MODEL || 'gemini-1.5-flash';
  const geminiEmbeddingModel = process.env.GEMINI_EMBEDDING_MODEL || 'text-embedding-004';

  let isLlmConfigured = false;
  let isEmbeddingConfigured = false;
  let error: string | undefined;

  if (provider === 'openai') {
    if (openaiKey && openaiKey.length > 5 && !openaiKey.includes('your-openai')) {
      isLlmConfigured = true;
    } else {
      error = 'OpenAI API key is not configured. Please set OPENAI_API_KEY in environment variables.';
    }
  } else if (provider === 'gemini') {
    if (geminiKey && geminiKey.length > 5 && !geminiKey.includes('your-gemini')) {
      isLlmConfigured = true;
    } else {
      error = 'Gemini API key is not configured. Please set GEMINI_API_KEY in environment variables.';
    }
  }

  if (embeddingProvider === 'openai') {
    if (openaiKey && openaiKey.length > 5 && !openaiKey.includes('your-openai')) {
      isEmbeddingConfigured = true;
    }
  } else if (embeddingProvider === 'gemini') {
    if (geminiKey && geminiKey.length > 5 && !geminiKey.includes('your-gemini')) {
      isEmbeddingConfigured = true;
    }
  }

  return {
    provider,
    isLlmConfigured,
    isEmbeddingConfigured,
    embeddingProvider,
    openaiModel,
    openaiEmbeddingModel,
    geminiModel,
    geminiEmbeddingModel,
    error,
  };
}

/**
 * Asserts that the LLM provider is properly configured before executing requests.
 * Throws a server error if missing.
 */
export function assertLLMConfigured(): AIConfig {
  const config = getAIConfig();
  if (!config.isLlmConfigured) {
    const err = new Error(config.error || `AI service is not configured. Please configure an LLM API key for ${config.provider.toUpperCase()}.`);
    (err as any).code = 'AI_PROVIDER_NOT_CONFIGURED';
    throw err;
  }
  return config;
}
