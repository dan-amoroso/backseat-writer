import { chatCompletion as openAIChatCompletion } from "$lib/openai";
import { chatCompletion as perplexityChatCompletion } from "$lib/perplexity";
import { generateContent as geminiGenerateContent } from "$lib/gemini";
import { chatCompletion as mistralChatCompletion } from "$lib/mistral";

// ── Types ──

export interface ProcessorComment {
  targetText: string;
  author: string;
  body: string;
}

export interface ProcessorResult {
  processorId: string;
  processorName: string;
  comments: ProcessorComment[];
  evaluation?: string;
  error?: string;
}

export type Provider = "OpenAI" | "Perplexity" | "Gemini" | "Mistral";

export interface ProviderBinding {
  provider: Provider;
  model: string;
}

export interface ProcessorDefinition {
  id: string;
  name: string;
  bindings: ProviderBinding[];
  systemPrompt: string;
  includeEvaluation: boolean;
}

export interface PipelineResult {
  results: ProcessorResult[];
}

export interface ApplyResult {
  commentsCreated: number;
  commentsFailed: number;
  failedComments: ProcessorComment[];
}

// ── Hardcoded processors ──

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

export const PROCESSORS: ProcessorDefinition[] = [
  {
    id: "grammar",
    name: "Grammar Checker",
    bindings: [
      { provider: "OpenAI", model: "gpt-4o-mini" },
      { provider: "Gemini", model: "gemini-2.0-flash" },
      { provider: "Perplexity", model: "sonar" },
    ],
    systemPrompt: `You are a precise grammar checker. Identify grammar, punctuation, and spelling issues in the given text. Only flag clear errors, not stylistic choices.

${JSON_FORMAT_INSTRUCTIONS}`,
    includeEvaluation: true,
  },
  {
    id: "style",
    name: "Style Advisor",
    bindings: [
      { provider: "OpenAI", model: "gpt-4o-mini" },
      { provider: "Gemini", model: "gemini-2.0-flash" },
      { provider: "Perplexity", model: "sonar" },
    ],
    systemPrompt: `You are a writing style advisor. Identify opportunities to improve clarity, conciseness, and readability. Focus on awkward phrasing, redundancy, weak verbs, and unclear sentences.

${JSON_FORMAT_INSTRUCTIONS}`,
    includeEvaluation: true,
  },
];

// ── Text extraction ──

export function extractTextFromNodes(nodes: any[]): string {
  let text = "";
  for (const node of nodes) {
    if (node.text) {
      text += node.text;
    }
    if (node.children) {
      text += extractTextFromNodes(node.children);
    }
    if (
      node.type === "paragraph" ||
      node.type === "heading" ||
      node.type === "quote"
    ) {
      text += "\n";
    }
  }
  return text;
}

// ── JSON parsing ──

interface ParsedResponse {
  comments: Array<{ targetText: string; body: string }>;
  evaluation?: string;
}

function parseProcessorResponse(raw: string): ParsedResponse {
  // Try direct parse
  try {
    const parsed = JSON.parse(raw);
    if (parsed && Array.isArray(parsed.comments)) {
      return parsed as ParsedResponse;
    }
  } catch {
    // fall through
  }

  // Try extracting a JSON object
  const braceMatch = raw.match(/\{[\s\S]*\}/);
  if (braceMatch) {
    try {
      const parsed = JSON.parse(braceMatch[0]);
      if (parsed && Array.isArray(parsed.comments)) {
        return parsed as ParsedResponse;
      }
    } catch {
      // fall through
    }
  }

  // Try extracting from fenced code block
  const fencedMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fencedMatch) {
    try {
      const parsed = JSON.parse(fencedMatch[1].trim());
      if (parsed && Array.isArray(parsed.comments)) {
        return parsed as ParsedResponse;
      }
    } catch {
      // fall through
    }
  }

  // Total failure — return no comments, raw text as evaluation
  return { comments: [], evaluation: raw };
}

// ── Resolve binding ──

function resolveBinding(
  bindings: ProviderBinding[],
  apiKeys: Record<string, string>,
  verifiedKeys: Record<string, boolean>,
): ProviderBinding | null {
  return (
    bindings.find((b) => verifiedKeys[b.provider] && apiKeys[b.provider]) ??
    null
  );
}

// ── Run a single processor ──

async function callProvider(
  binding: ProviderBinding,
  key: string,
  systemPrompt: string,
  userContent: string,
): Promise<string> {
  if (binding.provider === "Gemini") {
    const result = await geminiGenerateContent(key, {
      model: binding.model,
      systemInstruction: { parts: [{ text: systemPrompt }] },
      contents: [{ role: "user", parts: [{ text: userContent }] }],
    });
    return result.candidates?.[0]?.content?.parts?.[0]?.text || "";
  }

  const messages = [
    { role: "system" as const, content: systemPrompt },
    { role: "user" as const, content: userContent },
  ];

  if (binding.provider === "OpenAI") {
    const result = await openAIChatCompletion(key, {
      model: binding.model,
      messages,
    });
    return result.choices?.[0]?.message?.content || "";
  }

  if (binding.provider === "Mistral") {
    const result = await mistralChatCompletion(key, {
      model: binding.model,
      messages,
    });
    return result.choices?.[0]?.message?.content || "";
  }

  const result = await perplexityChatCompletion(key, {
    model: binding.model,
    messages,
  });
  return result.choices?.[0]?.message?.content || "";
}

export async function runProcessor(
  processor: ProcessorDefinition,
  binding: ProviderBinding,
  editorText: string,
  writingType: string,
  apiKeys: Record<string, string>,
): Promise<ProcessorResult> {
  const key = apiKeys[binding.provider];
  if (!key) {
    return {
      processorId: processor.id,
      processorName: processor.name,
      comments: [],
      error: `No API key for ${binding.provider}`,
    };
  }

  const userContent = `This is a ${writingType}. Please review the following text:\n\n${editorText}`;

  try {
    const raw = await callProvider(
      binding,
      key,
      processor.systemPrompt,
      userContent,
    );
    const parsed = parseProcessorResponse(raw);

    const comments: ProcessorComment[] = parsed.comments.map((c) => ({
      targetText: c.targetText,
      author: processor.name,
      body: c.body,
    }));

    return {
      processorId: processor.id,
      processorName: processor.name,
      comments,
      evaluation: processor.includeEvaluation ? parsed.evaluation : undefined,
    };
  } catch (err) {
    return {
      processorId: processor.id,
      processorName: processor.name,
      comments: [],
      error: err instanceof Error ? err.message : "Failed to get feedback",
    };
  }
}

// ── Run the full pipeline ──

export async function runPipeline(
  editorText: string,
  writingType: string,
  apiKeys: Record<string, string>,
  verifiedKeys: Record<string, boolean>,
  processorDefs?: ProcessorDefinition[],
): Promise<PipelineResult> {
  const defs = processorDefs ?? PROCESSORS;
  const resolved: {
    processor: ProcessorDefinition;
    binding: ProviderBinding;
  }[] = [];
  for (const p of defs) {
    const binding = resolveBinding(p.bindings, apiKeys, verifiedKeys);
    if (binding) {
      resolved.push({ processor: p, binding });
    }
  }

  if (resolved.length === 0) {
    return { results: [] };
  }

  const settled = await Promise.allSettled(
    resolved.map(({ processor, binding }) =>
      runProcessor(processor, binding, editorText, writingType, apiKeys),
    ),
  );

  const results: ProcessorResult[] = settled.map((s, i) => {
    if (s.status === "fulfilled") {
      return s.value;
    }
    return {
      processorId: resolved[i].processor.id,
      processorName: resolved[i].processor.name,
      comments: [],
      error: s.reason instanceof Error ? s.reason.message : "Unknown error",
    };
  });

  return { results };
}
