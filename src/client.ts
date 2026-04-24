/**
 * Browser-safe HTTP client for useknockout. Zero runtime deps.
 */

export const DEFAULT_BASE_URL = "https://useknockout--api.modal.run";

export type OutputFormat = "png" | "webp";
export type OpaqueFormat = "png" | "webp" | "jpg";

export interface KnockoutConfig {
  /** API bearer token. Required unless your deployment has no auth. */
  token?: string;
  /** Override the API base URL. Defaults to the hosted endpoint. */
  baseUrl?: string;
  /** Per-request timeout in ms. Default 60_000. */
  timeoutMs?: number;
  /** Custom fetch (edge runtimes / SSR polyfills). Defaults to global fetch. */
  fetch?: typeof fetch;
}

export interface ReplaceBackgroundInput {
  file: File | Blob;
  bgColor?: string;
  bgUrl?: string;
  format?: OpaqueFormat;
}

export class KnockoutError extends Error {
  public readonly status: number;
  public readonly code:
    | "auth"
    | "rate_limit"
    | "bad_request"
    | "payload_too_large"
    | "server"
    | "unknown";
  public readonly body: string;

  constructor(status: number, body: string) {
    const code = KnockoutError.classify(status);
    super(`Knockout API error ${status} (${code}): ${body || "no body"}`);
    this.name = "KnockoutError";
    this.status = status;
    this.code = code;
    this.body = body;
  }

  private static classify(status: number): KnockoutError["code"] {
    if (status === 401 || status === 403) return "auth";
    if (status === 429) return "rate_limit";
    if (status === 413) return "payload_too_large";
    if (status >= 400 && status < 500) return "bad_request";
    if (status >= 500) return "server";
    return "unknown";
  }
}

function resolveFetch(config: KnockoutConfig): typeof fetch {
  const f = config.fetch ?? globalThis.fetch;
  if (!f) {
    throw new Error(
      "Global fetch is unavailable. Provide `config.fetch` or run in a modern environment."
    );
  }
  return f.bind(globalThis);
}

function buildHeaders(config: KnockoutConfig): Record<string, string> {
  const headers: Record<string, string> = {};
  if (config.token) headers["Authorization"] = `Bearer ${config.token}`;
  return headers;
}

async function request(
  config: KnockoutConfig,
  path: string,
  init: { method: "GET" | "POST"; headers?: Record<string, string>; body?: BodyInit }
): Promise<Response> {
  const baseUrl = (config.baseUrl ?? DEFAULT_BASE_URL).replace(/\/+$/, "");
  const url = `${baseUrl}${path}`;
  const fetchImpl = resolveFetch(config);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), config.timeoutMs ?? 60_000);

  try {
    return await fetchImpl(url, {
      method: init.method,
      headers: { ...buildHeaders(config), ...(init.headers ?? {}) },
      body: init.body,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Remove the background from a File/Blob. Returns a Blob of the cleaned PNG/WebP.
 */
export async function callRemove(
  config: KnockoutConfig,
  file: File | Blob,
  format: OutputFormat = "png"
): Promise<Blob> {
  const form = new FormData();
  const filename = file instanceof File ? file.name : "image";
  form.append("file", file, filename);

  const res = await request(config, `/remove?format=${format}`, {
    method: "POST",
    body: form,
  });
  if (!res.ok) throw new KnockoutError(res.status, await res.text());
  return await res.blob();
}

/**
 * Replace the background with a solid color or a remote image URL.
 */
export async function callReplaceBackground(
  config: KnockoutConfig,
  input: ReplaceBackgroundInput
): Promise<Blob> {
  const form = new FormData();
  const filename = input.file instanceof File ? input.file.name : "image";
  form.append("file", input.file, filename);
  if (input.bgColor) form.append("bg_color", input.bgColor);
  if (input.bgUrl) form.append("bg_url", input.bgUrl);
  form.append("format", input.format ?? "png");

  const res = await request(config, "/replace-bg", {
    method: "POST",
    body: form,
  });
  if (!res.ok) throw new KnockoutError(res.status, await res.text());
  return await res.blob();
}

/**
 * Health check — returns `{ status, model }`.
 */
export async function callHealth(
  config: KnockoutConfig
): Promise<{ status: string; model: string }> {
  const res = await request(config, "/health", { method: "GET" });
  const body = await res.text();
  if (!res.ok) throw new KnockoutError(res.status, body);
  return JSON.parse(body);
}
