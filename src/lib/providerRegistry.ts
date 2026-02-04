import { chatCompletion as openAIChatCompletion } from "$lib/openai";
import { listModels as listOpenAIModels } from "$lib/openai";
import { validateKey as validateOpenAIKey } from "$lib/openai";
import { chatCompletion as perplexityChatCompletion } from "$lib/perplexity";
import { validateKey as validatePerplexityKey } from "$lib/perplexity";
import { generateContent as geminiGenerateContent } from "$lib/gemini";
import { listModels as listGeminiModels } from "$lib/gemini";
import { validateKey as validateGeminiKey } from "$lib/gemini";
import { chatCompletion as mistralChatCompletion } from "$lib/mistral";
import { listModels as listMistralModels } from "$lib/mistral";
import { validateKey as validateMistralKey } from "$lib/mistral";
import { chatCompletion as qwenChatCompletion } from "$lib/qwen";
import { listModels as listQwenModels } from "$lib/qwen";
import { validateKey as validateQwenKey } from "$lib/qwen";
import { chatCompletion as grokChatCompletion } from "$lib/grok";
import { listModels as listGrokModels } from "$lib/grok";
import { validateKey as validateGrokKey } from "$lib/grok";

const PERPLEXITY_MODELS = [
  "sonar-deep-research",
  "sonar-reasoning-pro",
  "sonar-reasoning",
  "sonar-pro",
  "sonar",
  "r1-1776",
];

export type Provider =
  | "OpenAI"
  | "Perplexity"
  | "Gemini"
  | "Mistral"
  | "Qwen"
  | "Grok";

export type ProviderValidationResult =
  | { valid: true }
  | { valid: false; error: string };

export interface ProviderModule {
  id: Provider;
  placeholder: string;
  canValidate: boolean;
  listModels: (apiKey: string) => Promise<string[]>;
  validateKey: (apiKey: string) => Promise<ProviderValidationResult>;
  generateText: (params: {
    apiKey: string;
    model: string;
    systemPrompt: string;
    userContent: string;
  }) => Promise<string>;
}

export const providerModules = {
  OpenAI: {
    id: "OpenAI",
    placeholder: "sk-...",
    canValidate: true,
    listModels: listOpenAIModels,
    validateKey: validateOpenAIKey,
    generateText: async ({ apiKey, model, systemPrompt, userContent }) => {
      const result = await openAIChatCompletion(apiKey, {
        model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userContent },
        ],
      });
      return result.choices?.[0]?.message?.content || "";
    },
  },
  Perplexity: {
    id: "Perplexity",
    placeholder: "pplx-...",
    canValidate: true,
    listModels: async () => PERPLEXITY_MODELS,
    validateKey: validatePerplexityKey,
    generateText: async ({ apiKey, model, systemPrompt, userContent }) => {
      const result = await perplexityChatCompletion(apiKey, {
        model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userContent },
        ],
      });
      return result.choices?.[0]?.message?.content || "";
    },
  },
  Gemini: {
    id: "Gemini",
    placeholder: "AIza...",
    canValidate: true,
    listModels: listGeminiModels,
    validateKey: validateGeminiKey,
    generateText: async ({ apiKey, model, systemPrompt, userContent }) => {
      const result = await geminiGenerateContent(apiKey, {
        model,
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents: [{ role: "user", parts: [{ text: userContent }] }],
      });
      return result.candidates?.[0]?.content?.parts?.[0]?.text || "";
    },
  },
  Mistral: {
    id: "Mistral",
    placeholder: "mk-...",
    canValidate: true,
    listModels: listMistralModels,
    validateKey: validateMistralKey,
    generateText: async ({ apiKey, model, systemPrompt, userContent }) => {
      const result = await mistralChatCompletion(apiKey, {
        model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userContent },
        ],
      });
      return result.choices?.[0]?.message?.content || "";
    },
  },
  Qwen: {
    id: "Qwen",
    placeholder: "sk-...",
    canValidate: true,
    listModels: listQwenModels,
    validateKey: validateQwenKey,
    generateText: async ({ apiKey, model, systemPrompt, userContent }) => {
      const result = await qwenChatCompletion(apiKey, {
        model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userContent },
        ],
      });
      return result.choices?.[0]?.message?.content || "";
    },
  },
  Grok: {
    id: "Grok",
    placeholder: "xai-...",
    canValidate: true,
    listModels: listGrokModels,
    validateKey: validateGrokKey,
    generateText: async ({ apiKey, model, systemPrompt, userContent }) => {
      const result = await grokChatCompletion(apiKey, {
        model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userContent },
        ],
      });
      return result.choices?.[0]?.message?.content || "";
    },
  },
} satisfies Record<Provider, ProviderModule>;

export const providerList = Object.values(providerModules);

export const providerIds = Object.keys(providerModules) as Provider[];

export function isProvider(value: string): value is Provider {
  return providerIds.includes(value as Provider);
}
