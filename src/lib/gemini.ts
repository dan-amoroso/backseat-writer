const BASE_URL = "https://generativelanguage.googleapis.com/v1beta";

// ── Types ──

export interface Content {
  role: "user" | "model";
  parts: { text: string }[];
}

export interface GenerateContentRequest {
  model: string;
  contents: Content[];
  systemInstruction?: { parts: { text: string }[] };
}

export interface GenerateContentResponse {
  candidates: {
    content: { role: string; parts: { text: string }[] };
    finishReason: string;
  }[];
  usageMetadata?: {
    promptTokenCount: number;
    candidatesTokenCount: number;
    totalTokenCount: number;
  };
}

export class GeminiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "GeminiError";
  }
}

// ── Client ──

export async function generateContent(
  apiKey: string,
  params: GenerateContentRequest,
): Promise<GenerateContentResponse> {
  const url = `${BASE_URL}/models/${params.model}:generateContent?key=${apiKey}`;

  const body: Record<string, unknown> = {
    contents: params.contents,
  };
  if (params.systemInstruction) {
    body.systemInstruction = params.systemInstruction;
  }

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => null);
    const message = data?.error?.message ?? `HTTP ${res.status}`;
    throw new GeminiError(res.status, message);
  }

  return res.json();
}

// ── Key validation ──

export async function validateKey(
  apiKey: string,
): Promise<{ valid: true } | { valid: false; error: string }> {
  if (!apiKey.trim()) {
    return { valid: false, error: "Key is empty" };
  }
  try {
    await generateContent(apiKey, {
      model: "gemini-2.0-flash",
      contents: [{ role: "user", parts: [{ text: "ping" }] }],
    });
    return { valid: true };
  } catch (err) {
    if (
      err instanceof GeminiError &&
      (err.status === 400 || err.status === 403)
    ) {
      return { valid: false, error: "Invalid API key" };
    }
    if (err instanceof TypeError) {
      return {
        valid: false,
        error: "Request failed (likely blocked by CORS)",
      };
    }
    const message = err instanceof Error ? err.message : "Unknown error";
    return { valid: false, error: message };
  }
}
