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

export interface ColorizeInput {
  file: File | Blob;
  format?: OpaqueFormat;
}

export interface SilhouetteInput {
  file: File | Blob;
  /** Hex color for the subject silhouette. Default "#7C3AED". */
  subjectColor?: string;
  /** Hex color for the background. Default "#FFFFFF". */
  bgColor?: string;
  format?: OpaqueFormat;
}

export interface InpaintBbox {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface InpaintInput {
  file: File | Blob;
  /**
   * Optional mask. White pixels = inpaint, black = keep. If omitted (and
   * no `bbox`), auto-subject mode runs BiRefNet and inverts the subject
   * mask — drop in a photo, get the subject erased.
   */
  mask?: File | Blob;
  /** Rectangular region to inpaint. Mutually exclusive with `mask`. */
  bbox?: InpaintBbox;
  /** Mask dilation in pixels. Default 8, range 0..32. */
  dilation?: number;
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

export interface StudioShotInput {
  file: File | Blob;
  bgColor?: string;
  /** Output aspect "W:H". Default "1:1". */
  aspect?: string;
  padding?: number;
  shadow?: boolean;
  /** Keep a transparent background. Ignores bgColor & shadow; output is PNG (jpg coerced). */
  transparent?: boolean;
  format?: OpaqueFormat;
}

export interface SmartCropInput {
  file: File | Blob;
  /** Padding around the subject bbox, in pixels. Default 24. */
  padding?: number;
  /** Transparent cutout (true) or cropped region from the original (false). Default true. */
  transparent?: boolean;
  format?: OpaqueFormat;
}

export interface StickerInput {
  file: File | Blob;
  /** Hex color for the outline. Default "#FFFFFF". */
  strokeColor?: string;
  /** Outline width in pixels. Default 20. */
  strokeWidth?: number;
  format?: OutputFormat;
}

export interface OutlineInput {
  file: File | Blob;
  /** Hex color for the outline. Default "#000000". */
  outlineColor?: string;
  /** Outline width in pixels. Default 4. */
  outlineWidth?: number;
  format?: OutputFormat;
}

export interface CompareInput {
  file: File | Blob;
  format?: OutputFormat;
}

export interface MaskInput {
  file: File | Blob;
  format?: OutputFormat;
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

/**
 * DDColor (Apache-2.0) — predicts plausible color from grayscale luminance.
 * Single feed-forward, ~500ms warm. Works on B&W or color input.
 */
export async function callColorize(
  config: KnockoutConfig,
  input: ColorizeInput
): Promise<Blob> {
  const form = new FormData();
  const filename = input.file instanceof File ? input.file.name : "image";
  form.append("file", input.file, filename);
  form.append("format", input.format ?? "png");

  const res = await request(config, "/colorize", { method: "POST", body: form });
  if (!res.ok) throw new KnockoutError(res.status, await res.text());
  return await res.blob();
}

/**
 * LaMa-based inpainting. Three modes auto-detected from what's passed.
 */
export async function callInpaint(
  config: KnockoutConfig,
  input: InpaintInput
): Promise<Blob> {
  const form = new FormData();
  const filename = input.file instanceof File ? input.file.name : "image";
  form.append("file", input.file, filename);
  if (input.mask) {
    const maskName = input.mask instanceof File ? input.mask.name : "mask.png";
    form.append("mask", input.mask, maskName);
  }
  if (input.bbox) {
    form.append("x", String(input.bbox.x));
    form.append("y", String(input.bbox.y));
    form.append("w", String(input.bbox.w));
    form.append("h", String(input.bbox.h));
  }
  if (input.dilation !== undefined) form.append("dilation", String(input.dilation));
  form.append("format", input.format ?? "png");

  const res = await request(config, "/inpaint", { method: "POST", body: form });
  if (!res.ok) throw new KnockoutError(res.status, await res.text());
  return await res.blob();
}

/**
 * Two-tone silhouette portrait — subject in one solid color, bg in another.
 */
export async function callSilhouette(
  config: KnockoutConfig,
  input: SilhouetteInput
): Promise<Blob> {
  const form = new FormData();
  const filename = input.file instanceof File ? input.file.name : "image";
  form.append("file", input.file, filename);
  if (input.subjectColor) form.append("subject_color", input.subjectColor);
  if (input.bgColor) form.append("bg_color", input.bgColor);
  form.append("format", input.format ?? "png");

  const res = await request(config, "/silhouette", { method: "POST", body: form });
  if (!res.ok) throw new KnockoutError(res.status, await res.text());
  return await res.blob();
}

/**
 * E-commerce preset — cutout + centered on canvas + optional drop shadow + aspect crop.
 * Pass `transparent: true` for a transparent-background PNG (bgColor & shadow ignored).
 */
export async function callStudioShot(
  config: KnockoutConfig,
  input: StudioShotInput
): Promise<Blob> {
  const form = new FormData();
  const filename = input.file instanceof File ? input.file.name : "image";
  form.append("file", input.file, filename);
  if (input.bgColor) form.append("bg_color", input.bgColor);
  if (input.aspect) form.append("aspect", input.aspect);
  if (input.padding !== undefined) form.append("padding", String(input.padding));
  if (input.shadow !== undefined) form.append("shadow", input.shadow ? "true" : "false");
  if (input.transparent !== undefined) {
    form.append("transparent", input.transparent ? "true" : "false");
  }
  form.append("format", input.format ?? "jpg");

  const res = await request(config, "/studio-shot", { method: "POST", body: form });
  if (!res.ok) throw new KnockoutError(res.status, await res.text());
  return await res.blob();
}

/**
 * Auto-crop to the subject bounding box + padding. Transparent cutout by default.
 */
export async function callSmartCrop(
  config: KnockoutConfig,
  input: SmartCropInput
): Promise<Blob> {
  const form = new FormData();
  const filename = input.file instanceof File ? input.file.name : "image";
  form.append("file", input.file, filename);
  form.append("padding", String(input.padding ?? 24));
  form.append("transparent", (input.transparent ?? true) ? "true" : "false");
  form.append("format", input.format ?? "png");

  const res = await request(config, "/smart-crop", { method: "POST", body: form });
  if (!res.ok) throw new KnockoutError(res.status, await res.text());
  return await res.blob();
}

/**
 * Sticker — thick contour outline around the subject on a transparent bg (iMessage style).
 */
export async function callSticker(
  config: KnockoutConfig,
  input: StickerInput
): Promise<Blob> {
  const form = new FormData();
  const filename = input.file instanceof File ? input.file.name : "image";
  form.append("file", input.file, filename);
  if (input.strokeColor) form.append("stroke_color", input.strokeColor);
  if (input.strokeWidth !== undefined) form.append("stroke_width", String(input.strokeWidth));
  form.append("format", input.format ?? "png");

  const res = await request(config, "/sticker", { method: "POST", body: form });
  if (!res.ok) throw new KnockoutError(res.status, await res.text());
  return await res.blob();
}

/**
 * Outline — thin stroke around the subject on a transparent bg.
 */
export async function callOutline(
  config: KnockoutConfig,
  input: OutlineInput
): Promise<Blob> {
  const form = new FormData();
  const filename = input.file instanceof File ? input.file.name : "image";
  form.append("file", input.file, filename);
  if (input.outlineColor) form.append("outline_color", input.outlineColor);
  if (input.outlineWidth !== undefined) form.append("outline_width", String(input.outlineWidth));
  form.append("format", input.format ?? "png");

  const res = await request(config, "/outline", { method: "POST", body: form });
  if (!res.ok) throw new KnockoutError(res.status, await res.text());
  return await res.blob();
}

/**
 * Before/after side-by-side preview — original on the left, cutout (on a checkerboard) on the right.
 */
export async function callCompare(
  config: KnockoutConfig,
  input: CompareInput
): Promise<Blob> {
  const form = new FormData();
  const filename = input.file instanceof File ? input.file.name : "image";
  form.append("file", input.file, filename);
  form.append("format", input.format ?? "png");

  const res = await request(config, "/compare", { method: "POST", body: form });
  if (!res.ok) throw new KnockoutError(res.status, await res.text());
  return await res.blob();
}

/**
 * Just the black/white subject mask, for your own compositing pipeline.
 */
export async function callMask(
  config: KnockoutConfig,
  input: MaskInput
): Promise<Blob> {
  const form = new FormData();
  const filename = input.file instanceof File ? input.file.name : "image";
  form.append("file", input.file, filename);
  form.append("format", input.format ?? "png");

  const res = await request(config, "/mask", { method: "POST", body: form });
  if (!res.ok) throw new KnockoutError(res.status, await res.text());
  return await res.blob();
}
