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

export interface HeadshotInput {
  file: File | Blob;
  bgColor?: string;
  bgBlur?: boolean;
  blurRadius?: number;
  /** Output aspect "W:H". Default "4:5" portrait. */
  aspect?: string;
  padding?: number;
  /** Vertical headroom 0–0.5. Default 0.18. */
  headTopRatio?: number;
  format?: OpaqueFormat;
}

export interface PreviewInput {
  file: File | Blob;
  /** Long-edge cap 64–1024. Default 512. */
  maxDim?: number;
  format?: OutputFormat;
}

export interface UpscaleInput {
  file: File | Blob;
  /** 2 or 4. Default 4. */
  scale?: 2 | 4;
  /**
   * Backend. `swin2sr` (default, v0.6.0+) is sharper on real photos.
   * `realesrgan` is the legacy backend — better on anime / illustrations.
   */
  model?: "swin2sr" | "realesrgan";
  /** Route through GFPGAN for sharper facial detail (slower). Implies realesrgan. */
  faceEnhance?: boolean;
  format?: OpaqueFormat;
}

export interface FaceRestoreInput {
  file: File | Blob;
  /** Restore only the most prominent face (faster). */
  onlyCenterFace?: boolean;
  format?: OpaqueFormat;
}

export interface EstimateInput {
  endpoint: string;
  width: number;
  height: number;
}

export interface EstimateResponse {
  endpoint: string;
  image_pixels: number;
  est_latency_ms_warm: number;
  est_latency_ms_cold: number;
  est_cost_usd: number;
  free_during_beta: boolean;
  note: string;
}

export interface StatsDay {
  date: string;
  count: number;
}

export interface StatsResponse {
  total_processed: number;
  today: number;
  last_7_days: StatsDay[];
  error?: string;
  detail?: string;
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

/**
 * Public usage counter — total + today + 7-day breakdown.
 */
export async function callStats(config: KnockoutConfig): Promise<StatsResponse> {
  const res = await request(config, "/stats", { method: "GET" });
  const body = await res.text();
  if (!res.ok) throw new KnockoutError(res.status, body);
  return JSON.parse(body) as StatsResponse;
}

/**
 * Predict latency + cost for an endpoint and image size. No GPU work.
 */
export async function callEstimate(
  config: KnockoutConfig,
  input: EstimateInput
): Promise<EstimateResponse> {
  const res = await request(config, "/estimate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      endpoint: input.endpoint,
      width: input.width,
      height: input.height,
    }),
  });
  if (!res.ok) throw new KnockoutError(res.status, await res.text());
  return (await res.json()) as EstimateResponse;
}

/**
 * LinkedIn-ready headshot — bg removal + portrait crop + center subject + bg color or blur.
 */
export async function callHeadshot(
  config: KnockoutConfig,
  input: HeadshotInput
): Promise<Blob> {
  const form = new FormData();
  const filename = input.file instanceof File ? input.file.name : "image";
  form.append("file", input.file, filename);
  if (input.bgColor) form.append("bg_color", input.bgColor);
  if (input.bgBlur !== undefined) form.append("bg_blur", input.bgBlur ? "true" : "false");
  if (input.blurRadius !== undefined) form.append("blur_radius", String(input.blurRadius));
  if (input.aspect) form.append("aspect", input.aspect);
  if (input.padding !== undefined) form.append("padding", String(input.padding));
  if (input.headTopRatio !== undefined) form.append("head_top_ratio", String(input.headTopRatio));
  form.append("format", input.format ?? "jpg");

  const res = await request(config, "/headshot", { method: "POST", body: form });
  if (!res.ok) throw new KnockoutError(res.status, await res.text());
  return await res.blob();
}

/**
 * Fast low-res preview cutout (~80ms warm). Skips refinement, downscales input.
 */
export async function callPreview(
  config: KnockoutConfig,
  input: PreviewInput
): Promise<Blob> {
  const form = new FormData();
  const filename = input.file instanceof File ? input.file.name : "image";
  form.append("file", input.file, filename);
  form.append("max_dim", String(input.maxDim ?? 512));
  form.append("format", input.format ?? "png");

  const res = await request(config, "/preview", { method: "POST", body: form });
  if (!res.ok) throw new KnockoutError(res.status, await res.text());
  return await res.blob();
}

/**
 * 2x / 4x super-resolution. Default backend Swin2SR; pass model="realesrgan" for legacy.
 */
export async function callUpscale(
  config: KnockoutConfig,
  input: UpscaleInput
): Promise<Blob> {
  const form = new FormData();
  const filename = input.file instanceof File ? input.file.name : "image";
  form.append("file", input.file, filename);
  form.append("scale", String(input.scale ?? 4));
  form.append("model", input.model ?? "swin2sr");
  if (input.faceEnhance !== undefined) {
    form.append("face_enhance", input.faceEnhance ? "true" : "false");
  }
  form.append("format", input.format ?? "png");

  const res = await request(config, "/upscale", { method: "POST", body: form });
  if (!res.ok) throw new KnockoutError(res.status, await res.text());
  return await res.blob();
}

/**
 * GFPGAN portrait restoration.
 */
export async function callFaceRestore(
  config: KnockoutConfig,
  input: FaceRestoreInput
): Promise<Blob> {
  const form = new FormData();
  const filename = input.file instanceof File ? input.file.name : "image";
  form.append("file", input.file, filename);
  if (input.onlyCenterFace !== undefined) {
    form.append("only_center_face", input.onlyCenterFace ? "true" : "false");
  }
  form.append("format", input.format ?? "png");

  const res = await request(config, "/face-restore", { method: "POST", body: form });
  if (!res.ok) throw new KnockoutError(res.status, await res.text());
  return await res.blob();
}
