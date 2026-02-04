import { providerModules, type Provider } from "$lib/providerRegistry";

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
  return providerModules[provider].listModels(apiKey);
}

export function invalidateCache(provider?: Provider): void {
  if (provider) {
    cache.delete(provider);
  } else {
    cache.clear();
  }
}
