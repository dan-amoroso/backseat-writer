import type { Provider } from "$lib/pipeline";
import { listModels as listOpenAIModels } from "$lib/openai";
import { listModels as listGeminiModels } from "$lib/gemini";
import { listModels as listMistralModels } from "$lib/mistral";

const PERPLEXITY_MODELS = [
  "sonar-deep-research",
  "sonar-reasoning-pro",
  "sonar-reasoning",
  "sonar-pro",
  "sonar",
  "r1-1776",
];

const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

interface CacheEntry {
  models: string[];
  timestamp: number;
  apiKey: string;
}

const cache = new Map<Provider, CacheEntry>();

export async function getModels(
  provider: Provider,
  apiKey: string,
): Promise<string[]> {
  const entry = cache.get(provider);
  if (
    entry &&
    entry.apiKey === apiKey &&
    Date.now() - entry.timestamp < CACHE_TTL_MS
  ) {
    return entry.models;
  }

  const models = await fetchModels(provider, apiKey);
  cache.set(provider, { models, timestamp: Date.now(), apiKey });
  return models;
}

async function fetchModels(
  provider: Provider,
  apiKey: string,
): Promise<string[]> {
  switch (provider) {
    case "OpenAI":
      return listOpenAIModels(apiKey);
    case "Gemini":
      return listGeminiModels(apiKey);
    case "Mistral":
      return listMistralModels(apiKey);
    case "Perplexity":
      return PERPLEXITY_MODELS;
  }
}

export function invalidateCache(provider?: Provider): void {
  if (provider) {
    cache.delete(provider);
  } else {
    cache.clear();
  }
}
