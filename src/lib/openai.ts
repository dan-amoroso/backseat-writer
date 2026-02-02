const BASE_URL = "https://api.openai.com/v1";

export type Role = "system" | "user" | "assistant";

export interface Message {
  role: Role;
  content: string;
}

export interface ChatCompletionRequest {
  model: string;
  messages: Message[];
  max_tokens?: number;
  temperature?: number;
  top_p?: number;
  stream?: boolean;
}

export interface Choice {
  index: number;
  message: Message;
  finish_reason: string | null;
  delta?: { role?: Role; content?: string };
}

export interface Usage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

export interface ChatCompletionResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Choice[];
  usage: Usage;
}

export class OpenAIError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "OpenAIError";
  }
}

async function request<T>(
  apiKey: string,
  path: string,
  body: Record<string, unknown>,
): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => null);
    const message = data?.error?.message ?? `HTTP ${res.status}`;
    throw new OpenAIError(res.status, message);
  }

  return res.json();
}

export function chatCompletion(
  apiKey: string,
  params: ChatCompletionRequest,
): Promise<ChatCompletionResponse> {
  return request<ChatCompletionResponse>(
    apiKey,
    "/chat/completions",
    params as unknown as Record<string, unknown>,
  );
}

export async function validateKey(
  apiKey: string,
): Promise<{ valid: true } | { valid: false; error: string }> {
  if (!apiKey.trim()) {
    return { valid: false, error: "Key is empty" };
  }
  try {
    await chatCompletion(apiKey, {
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: "ping" }],
      max_tokens: 1,
    });
    return { valid: true };
  } catch (err) {
    if (
      err instanceof OpenAIError &&
      (err.status === 401 || err.status === 403)
    ) {
      return { valid: false, error: "Invalid API key" };
    }
    if (err instanceof TypeError) {
      return { valid: false, error: "Request failed (likely blocked by CORS)" };
    }
    const message = err instanceof Error ? err.message : "Unknown error";
    return { valid: false, error: message };
  }
}
