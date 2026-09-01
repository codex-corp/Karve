export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type StructuredMode = "json_schema" | "json_object";

export type ChatCompletionRequest = {
  model: string;
  messages: ChatMessage[];
  response_format: Record<string, unknown>;
  temperature?: number;
};

export type BifrostChatResult = {
  content: string;
  model: string | null;
  usage: Record<string, unknown> | null;
  extra_fields: Record<string, unknown> | null;
  raw_id: string | null;
};

export class BifrostHttpError extends Error {
  readonly status: number;
  readonly body: string;

  constructor(status: number, body: string) {
    super(`Bifrost HTTP ${status}: ${body.slice(0, 800)}`);
    this.name = "BifrostHttpError";
    this.status = status;
    this.body = body;
  }
}

function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.replace(/\/+$/, "");
}

function headers(token?: string): Record<string, string> {
  const result: Record<string, string> = {
    "Content-Type": "application/json"
  };

  if (token && token.trim() !== "") {
    result.Authorization = `Bearer ${token.trim()}`;
  }

  return result;
}

async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number
): Promise<Response> {
  return fetch(url, {
    ...init,
    signal: AbortSignal.timeout(timeoutMs)
  });
}

export async function healthCheck(
  baseUrl: string,
  token: string | undefined,
  timeoutMs: number
): Promise<unknown> {
  const response = await fetchWithTimeout(
    `${normalizeBaseUrl(baseUrl)}/health`,
    { method: "GET", headers: headers(token) },
    timeoutMs
  );

  const body = await response.text();
  if (!response.ok) {
    throw new BifrostHttpError(response.status, body);
  }

  try {
    return JSON.parse(body);
  } catch {
    return body;
  }
}

export async function listModels(
  baseUrl: string,
  token: string | undefined,
  timeoutMs: number
): Promise<string[]> {
  const response = await fetchWithTimeout(
    `${normalizeBaseUrl(baseUrl)}/v1/models`,
    { method: "GET", headers: headers(token) },
    timeoutMs
  );

  const body = await response.text();
  if (!response.ok) {
    throw new BifrostHttpError(response.status, body);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(body);
  } catch (error) {
    throw new Error(`Bifrost /v1/models returned invalid JSON: ${String(error)}`);
  }

  if (
    !parsed ||
    typeof parsed !== "object" ||
    !("data" in parsed) ||
    !Array.isArray((parsed as { data?: unknown }).data)
  ) {
    throw new Error("Bifrost /v1/models response is missing data[]");
  }

  return ((parsed as { data: unknown[] }).data)
    .map((item) => {
      if (!item || typeof item !== "object" || !("id" in item)) {
        return null;
      }
      const id = (item as { id?: unknown }).id;
      return typeof id === "string" ? id : null;
    })
    .filter((id): id is string => id !== null);
}

export async function chatCompletion(
  baseUrl: string,
  token: string | undefined,
  request: ChatCompletionRequest,
  timeoutMs: number
): Promise<BifrostChatResult> {
  const response = await fetchWithTimeout(
    `${normalizeBaseUrl(baseUrl)}/v1/chat/completions`,
    {
      method: "POST",
      headers: headers(token),
      body: JSON.stringify(request)
    },
    timeoutMs
  );

  const body = await response.text();
  if (!response.ok) {
    throw new BifrostHttpError(response.status, body);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(body);
  } catch (error) {
    throw new Error(`Bifrost chat response is invalid JSON: ${String(error)}`);
  }

  if (!parsed || typeof parsed !== "object") {
    throw new Error("Bifrost chat response is not an object");
  }

  const responseObject = parsed as {
    id?: unknown;
    model?: unknown;
    choices?: unknown;
    usage?: unknown;
    extra_fields?: unknown;
  };

  if (!Array.isArray(responseObject.choices) || responseObject.choices.length === 0) {
    throw new Error("Bifrost chat response has no choices[]");
  }

  const firstChoice = responseObject.choices[0];
  if (!firstChoice || typeof firstChoice !== "object") {
    throw new Error("Bifrost first choice is invalid");
  }

  const message = (firstChoice as { message?: unknown }).message;
  if (!message || typeof message !== "object") {
    throw new Error("Bifrost first choice has no message object");
  }

  const content = (message as { content?: unknown }).content;
  if (typeof content !== "string" || content.trim() === "") {
    throw new Error("Bifrost assistant content is empty or non-string");
  }

  return {
    content,
    model: typeof responseObject.model === "string" ? responseObject.model : null,
    usage:
      responseObject.usage && typeof responseObject.usage === "object"
        ? (responseObject.usage as Record<string, unknown>)
        : null,
    extra_fields:
      responseObject.extra_fields && typeof responseObject.extra_fields === "object"
        ? (responseObject.extra_fields as Record<string, unknown>)
        : null,
    raw_id: typeof responseObject.id === "string" ? responseObject.id : null
  };
}
