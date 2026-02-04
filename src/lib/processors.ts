import { createPersistentStore } from "$lib/storage";
import { get } from "svelte/store";
import type { Provider } from "$lib/pipeline";

export interface Processor {
  id: string;
  name: string;
  author: string;
  personality: string;
  provider: Provider;
  model: string;
  includeEvaluation: boolean;
  active: boolean;
}

const JSON_FORMAT_INSTRUCTIONS = `Respond with ONLY a JSON object in this exact format:
{
  "comments": [
    { "targetText": "exact text from the document", "body": "your comment about this text" }
  ],
  "evaluation": "A brief overall evaluation paragraph"
}

Rules for targetText:
- Must be an EXACT substring of the document (case-sensitive, including punctuation)
- Keep it short: a phrase or single sentence, not a whole paragraph
- Each targetText must appear only once in the document — if the same phrase appears multiple times, skip it`;

const DEFAULT_PROCESSORS: Processor[] = [
  {
    id: "grammar",
    name: "Grammar",
    author: "Grammar Checker",
    personality: `You are a precise grammar checker. Identify grammar, punctuation, and spelling issues in the given text. Only flag clear errors, not stylistic choices.\n\n${JSON_FORMAT_INSTRUCTIONS}`,
    provider: "OpenAI",
    model: "gpt-4o-mini",
    includeEvaluation: true,
  },
  {
    id: "style",
    name: "Style",
    author: "Style Advisor",
    personality: `You are a writing style advisor. Identify opportunities to improve clarity, conciseness, and readability. Focus on awkward phrasing, redundancy, weak verbs, and unclear sentences.\n\n${JSON_FORMAT_INSTRUCTIONS}`,
    provider: "OpenAI",
    model: "gpt-4o-mini",
    includeEvaluation: true,
  },
];

export const processors = createPersistentStore<Processor[]>(
  "processors",
  DEFAULT_PROCESSORS,
);

export function addProcessor(): Processor {
  const processor: Processor = {
    id: crypto.randomUUID(),
    name: "New Processor",
    author: "AI",
    personality: JSON_FORMAT_INSTRUCTIONS,
    provider: "OpenAI",
    model: "gpt-4o-mini",
    includeEvaluation: true,
  };
  processors.update((list) => [...list, processor]);
  return processor;
}

export function updateProcessor(updated: Processor): void {
  processors.update((list) =>
    list.map((p) => (p.id === updated.id ? updated : p)),
  );
}

export function removeProcessor(id: string): void {
  processors.update((list) => list.filter((p) => p.id !== id));
}
