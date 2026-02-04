import { browser } from "$app/environment";
import { writable, type Writable } from "svelte/store";

const STORAGE_PREFIX = "backseatwriter:";

function storageKey(key: string): string {
  return `${STORAGE_PREFIX}${key}`;
}

export function clearStorage(): void {
  if (!browser) return;
  for (let i = localStorage.length - 1; i >= 0; i -= 1) {
    const key = localStorage.key(i);
    if (key && key.startsWith(STORAGE_PREFIX)) {
      localStorage.removeItem(key);
    }
  }
}

export function loadJson<T>(key: string, fallback: T): T {
  if (!browser) {
    return fallback;
  }
  const raw = localStorage.getItem(storageKey(key));
  if (!raw) {
    return fallback;
  }
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function saveJson<T>(key: string, value: T): void {
  if (!browser) {
    return;
  }
  localStorage.setItem(storageKey(key), JSON.stringify(value));
}

export function createPersistentStore<T>(
  key: string,
  fallback: T,
): Writable<T> {
  const store = writable<T>(loadJson(key, fallback));
  store.subscribe((value) => saveJson(key, value));
  return store;
}

export type Settings = {
  writingType: string;
  apiKeys: Record<string, string>;
  verifiedKeys: Record<string, boolean>;
};

const defaultSettings: Settings = {
  writingType: "Blog Post",
  apiKeys: {},
  verifiedKeys: {},
};

export const settings = createPersistentStore<Settings>(
  "settings",
  defaultSettings,
);

export function setSetting<Key extends keyof Settings>(
  key: Key,
  value: Settings[Key],
): void {
  settings.update((current) => ({ ...current, [key]: value }));
}

export function setApiKey(provider: string, value: string): void {
  settings.update((current) => ({
    ...current,
    apiKeys: { ...current.apiKeys, [provider]: value },
  }));
}

export function setVerifiedKey(provider: string, verified: boolean): void {
  settings.update((current) => ({
    ...current,
    verifiedKeys: { ...current.verifiedKeys, [provider]: verified },
  }));
}
