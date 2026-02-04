import { createPersistentStore } from "$lib/storage";
import type { Provider } from "$lib/pipeline";

export interface Processor {
  id: string;
  name: string;
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

function stripJsonFormatInstructions(prompt: string): string {
  const normalized = prompt.trim();
  if (!normalized) return "";
  if (!normalized.endsWith(JSON_FORMAT_INSTRUCTIONS)) return normalized;
  return normalized
    .slice(0, normalized.length - JSON_FORMAT_INSTRUCTIONS.length)
    .trim();
}

export function buildProcessorSystemPrompt(personality: string): string {
  const trimmed = personality.trim();
  if (!trimmed) return JSON_FORMAT_INSTRUCTIONS;
  if (trimmed.includes(JSON_FORMAT_INSTRUCTIONS)) return trimmed;
  const base = stripJsonFormatInstructions(trimmed);
  if (!base) return JSON_FORMAT_INSTRUCTIONS;
  return `${base}\n\n${JSON_FORMAT_INSTRUCTIONS}`;
}

const DEFAULT_PROCESSORS: Processor[] = [
  {
    id: "hn-snark",
    name: "HN Snark",
    personality:
      'You are a Hacker News commenter. Be curt, skeptical, and a bit dismissive, but still specific and actionable about the writing. Avoid slurs or threats. Prioritize pointing out weak logic, vague claims, and lack of evidence. Occasionally start your comments with the word "actually".',
    provider: "Grok",
    model: "grok-4",
    includeEvaluation: true,
    active: true,
  },
  {
    id: "grammar",
    name: "Grammar Checker",
    personality:
      "You are a precise grammar checker. Identify grammar, punctuation, and spelling issues in the given text. Only flag clear errors, not stylistic choices.",
    provider: "OpenAI",
    model: "gpt-4o-mini",
    includeEvaluation: true,
    active: true,
  },
  {
    id: "style",
    name: "Style Advisor",
    personality:
      "You are a writing style advisor. Identify opportunities to improve clarity, conciseness, and readability. Focus on awkward phrasing, redundancy, weak verbs, and unclear sentences.",
    provider: "OpenAI",
    model: "gpt-4o-mini",
    includeEvaluation: true,
    active: true,
  },
];

export const processors = createPersistentStore<Processor[]>(
  "processors",
  DEFAULT_PROCESSORS,
);

processors.update((list) =>
  list.map((p) => ({
    ...p,
    personality: stripJsonFormatInstructions(p.personality),
  })),
);

export function addProcessor(): Processor {
  const processor: Processor = {
    id: crypto.randomUUID(),
    name: "New Persona",
    personality: "",
    provider: "OpenAI",
    model: "gpt-4o-mini",
    includeEvaluation: true,
    active: true,
  };
  processors.update((list) => [...list, processor]);
  return processor;
}

export function updateProcessor(updated: Processor): void {
  const sanitized: Processor = {
    ...updated,
    personality: stripJsonFormatInstructions(updated.personality),
  };
  processors.update((list) =>
    list.map((p) => (p.id === sanitized.id ? sanitized : p)),
  );
}

export function toggleProcessor(id: string): void {
  processors.update((list) =>
    list.map((p) => (p.id === id ? { ...p, active: !p.active } : p)),
  );
}

export function removeProcessor(id: string): void {
  processors.update((list) => list.filter((p) => p.id !== id));
}
