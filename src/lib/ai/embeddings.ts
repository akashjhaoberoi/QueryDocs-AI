import { generateOpenAIEmbedding } from './openai';
import { generateGeminiEmbedding } from './gemini';
import { getAIConfig } from './config';

export async function generateEmbedding(text: string): Promise<number[]> {
  const config = getAIConfig();
  const provider = config.embeddingProvider;

  try {
    if (provider === 'gemini') {
      if (config.isEmbeddingConfigured) {
        return await generateGeminiEmbedding(text);
      }
    } else {
      if (config.isEmbeddingConfigured) {
        return await generateOpenAIEmbedding(text);
      }
    }

    if (process.env.OPENAI_API_KEY?.trim()) {
      return await generateOpenAIEmbedding(text);
    }

    if (process.env.GEMINI_API_KEY?.trim()) {
      return await generateGeminiEmbedding(text);
    }
  } catch (err) {
    console.warn('API Embedding failed, falling back to pseudo-embedding:', err);
  }

  // Generate deterministic 1536 pseudo-embedding vector when API key is missing
  const vector = new Array(1536).fill(0);
  const clean = text.toLowerCase().replace(/[^a-z0-9]/g, '');

  for (let i = 0; i < clean.length; i++) {
    const charCode = clean.charCodeAt(i);
    const idx = (charCode * 31 + i) % 1536;
    vector[idx] += 0.1;
  }

  let norm = 0;
  for (let i = 0; i < 1536; i++) {
    norm += vector[i] * vector[i];
  }
  norm = Math.sqrt(norm) || 1;
  for (let i = 0; i < 1536; i++) {
    vector[i] = vector[i] / norm;
  }

  return vector;
}
