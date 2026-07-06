---
project: projects/useknockout-react
type: readme
---

<div align="center">

  # 🥊 @useknockout/react

  **React hooks for [useknockout](https://github.com/useknockout/api) — state-of-the-art background removal API.**

  [![MIT License](https://img.shields.io/badge/license-MIT-3da639)](./LICENSE)
  [![npm version](https://img.shields.io/npm/v/@useknockout/react?color=cb3837)](https://www.npmjs.com/package/@useknockout/react)
  [![npm downloads](https://img.shields.io/npm/dm/@useknockout/react?color=cb3837)](https://www.npmjs.com/package/@useknockout/react)
  [![GitHub stars](https://img.shields.io/github/stars/useknockout/react?style=social)](https://github.com/useknockout/react)
  [![React](https://img.shields.io/badge/React-%E2%89%A518-61dafb?logo=react&logoColor=white)](https://react.dev)
  [![TypeScript](https://img.shields.io/badge/TypeScript-3178c6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
  [![Zero deps](https://img.shields.io/badge/runtime%20deps-0-success)](./package.json)

  [**Install**](#install) · [**Quick Start**](#quick-start) · [**Hooks**](#hooks) · [**Provider**](#knockoutprovider) · [**API repo**](https://github.com/useknockout/api)

  <br/>

  <img src="https://raw.githubusercontent.com/useknockout/api/main/docs/hero.png" alt="useknockout before/after — background removal demo" width="800"/>

  <br/>

  *Drop-in hooks. Works with Next, Remix, Vite. Zero deps.*

</div>

---

- **Drop-in hooks** — `useRemoveBackground`, `useReplaceBackground`
- **Zero runtime dependencies** — uses global `fetch` + `FormData`
- **Works everywhere React does** — Next.js, Remix, Vite, CRA, React Native Web
- **First-class TypeScript** — full types, no `any`s
- **MIT licensed**

---

## Install

```bash
npm install @useknockout/react
# or
pnpm add @useknockout/react
# or
yarn add @useknockout/react
```

Requires **React 18+**.

## Quick start

### 1. Basic usage (no provider needed)

```tsx
import { useRemoveBackground } from "@useknockout/react";

export function BackgroundRemover() {
  const { remove, dataUrl, isLoading, error } = useRemoveBackground({
    token: "kno_public_beta_4d7e9f1a3c5b2e8d6a9f7c1b3e5d8a2f",
  });

  return (
    <div>
      <input
        type="file"
        accept="image/*"
        onChange={(e) => e.target.files?.[0] && remove(e.target.files[0])}
      />
      {isLoading && <p>Processing...</p>}
      {error && <p>Error: {error.message}</p>}
      {dataUrl && <img src={dataUrl} alt="result" />}
    </div>
  );
}
```

### 2. Recommended — provider at the root

```tsx
// app/layout.tsx  (Next.js App Router)
import { KnockoutProvider } from "@useknockout/react";

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <KnockoutProvider token={process.env.NEXT_PUBLIC_KNOCKOUT_TOKEN}>
          {children}
        </KnockoutProvider>
      </body>
    </html>
  );
}
```

Then anywhere below:

```tsx
import { useRemoveBackground, useReplaceBackground } from "@useknockout/react";

function RemoveDemo() {
  const { remove, dataUrl, isLoading } = useRemoveBackground();
  // ...
}

function ReplaceDemo() {
  const { replaceBackground, dataUrl, isLoading } = useReplaceBackground();

  const onFile = async (file: File) => {
    await replaceBackground({ file, bgColor: "#FF5733", format: "jpg" });
  };
  // ...
}
```

> ⚠️ **Security tip:** In production, proxy API calls through your own server so your token never reaches the browser. The `token` option here is meant for private apps, prototyping, or environments where the token is already scoped/rate-limited.

---

## Hooks

### `useRemoveBackground(options?)`

Removes the background from a file and returns a transparent PNG/WebP.

**Options** (extends [`KnockoutConfig`](#knockoutconfig)):

| Option | Type | Default | Description |
|---|---|---|---|
| `format` | `"png" \| "webp"` | `"png"` | Output format (alpha included). |

**Returns:**

| Field | Type | Description |
|---|---|---|
| `remove` | `(file: File \| Blob) => Promise<Blob>` | Trigger the request. |
| `data` | `Blob \| null` | Most recent result. |
| `dataUrl` | `string \| null` | Object URL (auto-revoked on next call / unmount). |
| `isLoading` | `boolean` | In-flight state. |
| `error` | `Error \| KnockoutError \| null` | Last error. |
| `reset` | `() => void` | Clear state. |

### `useReplaceBackground(options?)`

Removes the background and composites the subject onto a new background.

**Options** (extends [`KnockoutConfig`](#knockoutconfig)):

| Option | Type | Default | Description |
|---|---|---|---|
| `format` | `"png" \| "webp" \| "jpg"` | `"png"` | Output format. `jpg` = smallest file. |

**Returns:**

| Field | Type | Description |
|---|---|---|
| `replaceBackground` | `(input) => Promise<Blob>` | Trigger the request. |
| `data`, `dataUrl`, `isLoading`, `error`, `reset` | — | Same as `useRemoveBackground`. |

**`input` shape:**

| Field | Type | Description |
|---|---|---|
| `file` | `File \| Blob` | Foreground image. |
| `bgColor` | `string?` | Hex color like `"#FF5733"`. Default `"#FFFFFF"`. Ignored if `bgUrl` is set. |
| `bgUrl` | `string?` | Remote URL of a background image. |
| `format` | `"png" \| "webp" \| "jpg"?` | Per-call override. |

### `useHeadshot(options?)` — v0.4.0

LinkedIn-ready professional headshot — background removed, solid backdrop or blurred background, portrait crop with the subject centered and configurable headroom.

```tsx
const { headshot, dataUrl, isLoading } = useHeadshot();

await headshot({ file, bgColor: "#f5f5f5", aspect: "4:5" });
await headshot({ file, bgBlur: true, blurRadius: 24 }); // blurred bg instead of solid color
```

**`input` shape:** `{ file, bgColor?, bgBlur?, blurRadius?, aspect?, padding?, headTopRatio?, format? }`

- `aspect` — output aspect `"W:H"`. Default `"4:5"` portrait.
- `headTopRatio` — vertical headroom `0–0.5`. Default `0.18`.
- Default `format` is `jpg`.

### `usePreview(options?)` — v0.4.0

Cheap, fast low-res preview cutout (~80ms warm). Skips refinement and downscales the input — use for thumbnail UI before triggering the full-res request.

```tsx
const { preview, dataUrl, isLoading } = usePreview();

await preview({ file, maxDim: 512 });
```

**`input` shape:** `{ file, maxDim?, format?: "png" | "webp" }` — `maxDim` is the long-edge cap, `64–1024`, default `512`.

### `useStats(options?)` — v0.4.0

Public usage stats — total images processed, last 24h, 7-day trend. No auth required.

```tsx
const { stats, data, isLoading } = useStats();

useEffect(() => { stats(); }, []);
// data → { total, last_24h, last_7d }
```

### `useUpscale(options?)` — v0.6.0

**Swin2SR / Real-ESRGAN x2/x4 super-resolution.** Defaults to **Swin2SR** (SwinV2 Transformer) — sharper detail and natural texture on real photos. Pass `model: "realesrgan"` for the legacy backend (better on anime / illustrations).

```tsx
const { upscale, dataUrl, isLoading } = useUpscale();

await upscale({ file, scale: 4 });
await upscale({ file, scale: 4, model: "realesrgan" });
await upscale({ file, scale: 4, faceEnhance: true }); // route through GFPGAN (implies realesrgan)
```

**`input` shape:** `{ file, scale?: 2 | 4, model?: "swin2sr" | "realesrgan", faceEnhance?, format?: "png" | "webp" | "jpg" }` — `scale` defaults to `4`.

### `useFaceRestore(options?)` — v0.5.0

**GFPGAN v1.4 face restoration.** Restores blurred/compressed faces while preserving identity. Multi-face safe; background also upscaled.

```tsx
const { faceRestore, dataUrl, isLoading } = useFaceRestore();

await faceRestore({ file });
await faceRestore({ file, onlyCenterFace: true, bgEnhance: true });
```

**`input` shape:** `{ file, onlyCenterFace?, bgEnhance?, format?: "png" | "webp" | "jpg" }`

- `onlyCenterFace` — restore only the most prominent face (faster).
- `bgEnhance` — also upscale the background 2x via Real-ESRGAN. Default `false` (background preserved as-is).

### `useColorize(options?)` — v0.7.0

**DDColor (Apache-2.0) image colorization.** Predicts plausible color from grayscale luminance in a single feed-forward pass (~500ms warm). Works on black-and-white or color input.

```tsx
const { colorize, dataUrl, isLoading } = useColorize();

await colorize(file);
```

**`colorize(file, options?)`** — `{ format?: "png" | "webp" | "jpg" }`

### `useSilhouette(options?)` — v0.7.0

**Two-tone silhouette portrait** — the subject rendered in one solid color, the background in another.

```tsx
const { silhouette, dataUrl, isLoading } = useSilhouette();

await silhouette(file, { subjectColor: "#1E2960", bgColor: "#F0857C" });
```

**`silhouette(file, options?)`** — `{ subjectColor?, bgColor?, format?: "png" | "webp" | "jpg" }`

- `subjectColor` — hex color for the subject. Default `"#7C3AED"`.
- `bgColor` — hex color for the background. Default `"#FFFFFF"`.

### `useInpaint(options?)` — v0.7.0

**LaMa-based inpainting.** Erase part of an image and fill the hole convincingly. Three modes are auto-detected from what you pass:

```tsx
const { inpaint, dataUrl, isLoading } = useInpaint();

// 1. Auto-erase subject (BiRefNet subject mask, inverted) — drop in a photo, subject is erased:
await inpaint(file);

// 2. Erase a rectangular region:
await inpaint(file, { bbox: { x: 100, y: 100, w: 300, h: 400 } });

// 3. Erase a custom mask (white = inpaint, black = keep):
await inpaint(file, { mask: maskBlob });
```

**`inpaint(file, options?)`** — `{ mask?, bbox?: { x, y, w, h }, dilation?, format?: "png" | "webp" | "jpg" }`

- `mask` and `bbox` are mutually exclusive.
- `dilation` — mask dilation in pixels. Default `8`, range `0–32`.

### `useStudioShot(options?)` — v0.3.0

**E-commerce product preset** — cutout, centered on a canvas, optional drop shadow, standardized aspect. Pass `transparent: true` for a transparent-background PNG.

```tsx
const { generate, dataUrl, isLoading } = useStudioShot();

await generate(file, { aspect: "1:1" });
await generate(file, { transparent: true }); // transparent PNG
await generate(file, { enhance: true });     // brightness + saturation lift
```

**`generate(file, options?)`** — `{ bgColor?, aspect?, padding?, shadow?, transparent?, enhance?, enhanceStrength?, format?: "png" | "webp" | "jpg" }`

### `useSmartCrop(options?)` — v0.3.0

**Auto-crop to the subject bounding box + padding.** Transparent cutout by default.

```tsx
const { generate, dataUrl, isLoading } = useSmartCrop();
await generate(file, { padding: 32 });
```

**`generate(file, options?)`** — `{ padding?, transparent?, format?: "png" | "webp" | "jpg" }`

### `useSticker(options?)` — v0.3.0

**Sticker** — thick contour outline around the subject on a transparent bg (iMessage / WhatsApp style).

```tsx
const { generate, dataUrl, isLoading } = useSticker();
await generate(file, { strokeWidth: 24 });
```

**`generate(file, options?)`** — `{ strokeColor?, strokeWidth?, format?: "png" | "webp" }`

### `useOutline(options?)` — v0.3.0

**Outline** — thin stroke around the subject on a transparent bg.

```tsx
const { generate, dataUrl, isLoading } = useOutline();
await generate(file, { outlineColor: "#000000", outlineWidth: 4 });
```

**`generate(file, options?)`** — `{ outlineColor?, outlineWidth?, format?: "png" | "webp" }`

### `useCompare(options?)` — v0.3.0

**Before/after side-by-side** — original on the left, cutout (on a checkerboard) on the right. Great for marketing screenshots.

```tsx
const { generate, dataUrl, isLoading } = useCompare();
await generate(file);
```

**`generate(file, options?)`** — `{ format?: "png" | "webp" }`

### `useMask(options?)` — v0.3.0

**Black/white subject mask** for your own compositing pipeline.

```tsx
const { generate, dataUrl, isLoading } = useMask();
await generate(file);
```

**`generate(file, options?)`** — `{ format?: "png" | "webp" }`

All hooks return `{ data, dataUrl, isLoading, error, reset }` plus the trigger function above.

---

## `KnockoutProvider`

Provide `token`, `baseUrl`, `timeoutMs`, or a custom `fetch` to all child hooks.

```tsx
<KnockoutProvider
  token="kno_..."
  baseUrl="https://useknockout--api.modal.run"
  timeoutMs={60_000}
>
  <App />
</KnockoutProvider>
```

Per-hook options merge over provider values — override just what you need at the call site.

---

## `KnockoutConfig`

| Option | Type | Default | Description |
|---|---|---|---|
| `token` | `string` | — | Bearer token. Required when the API has auth enabled. |
| `baseUrl` | `string` | `https://useknockout--api.modal.run` | Override for self-hosted deployments. |
| `timeoutMs` | `number` | `60_000` | Per-request timeout. |
| `fetch` | `typeof fetch` | `globalThis.fetch` | Custom fetch (SSR / edge runtimes / polyfills). |

---

## `KnockoutError`

Thrown on any non-2xx response. Fields:

- `status` — HTTP status code
- `code` — `"auth" | "rate_limit" | "bad_request" | "payload_too_large" | "server" | "unknown"`
- `body` — raw response body string

```tsx
import { KnockoutError } from "@useknockout/react";

const { remove, error } = useRemoveBackground();

if (error instanceof KnockoutError && error.code === "payload_too_large") {
  // prompt the user to pick a smaller image
}
```

---

## Complete drag-and-drop example

```tsx
import { useState } from "react";
import { useRemoveBackground } from "@useknockout/react";

export function RemoveBgDropzone() {
  const [isDragging, setIsDragging] = useState(false);
  const { remove, dataUrl, isLoading, error, reset } = useRemoveBackground();

  const onFiles = async (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    await remove(file);
  };

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={(e) => { e.preventDefault(); setIsDragging(false); onFiles(e.dataTransfer.files); }}
      style={{
        border: `2px dashed ${isDragging ? "#007BFF" : "#ccc"}`,
        borderRadius: 12,
        padding: 48,
        textAlign: "center",
      }}
    >
      {isLoading && <p>Removing background…</p>}
      {error && <p style={{ color: "crimson" }}>{error.message}</p>}
      {!dataUrl && !isLoading && (
        <label>
          <p>Drop an image or click to pick one</p>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => onFiles(e.target.files)}
            hidden
          />
        </label>
      )}
      {dataUrl && (
        <div>
          <img src={dataUrl} alt="cutout" style={{ maxWidth: "100%" }} />
          <button onClick={reset}>Try another</button>
        </div>
      )}
    </div>
  );
}
```

---

## Project structure

```
src/
  index.ts              Public entry — re-exports every hook, the provider, the client, and all types
  client.ts             Zero-dep browser HTTP client (callRemove, callReplaceBackground, …) + KnockoutError + KnockoutConfig
  KnockoutProvider.ts   React context provider + useKnockoutConfig (merges provider config with per-hook overrides)
  useRemoveBackground.ts
  useReplaceBackground.ts
  useHeadshot.ts        useColorize.ts    useSilhouette.ts   useInpaint.ts
  usePreview.ts         useUpscale.ts     useFaceRestore.ts  useStats.ts
  useStudioShot.ts      useSmartCrop.ts   useSticker.ts      useOutline.ts
  useCompare.ts         useMask.ts
```

Every image hook follows the same shape: it calls `useKnockoutConfig` to resolve config, manages `data` / `dataUrl` / `isLoading` / `error` state, auto-revokes the previous object URL on each call and on unmount, and exposes a trigger plus `reset`. Built with **tsup** to dual ESM + CJS with `.d.ts` types; `react`/`react-dom` are externalized.

## Framework notes

- **Next.js App Router** — the provider and hooks work in any `"use client"` component. Keep `NEXT_PUBLIC_KNOCKOUT_TOKEN` in env for prototyping, or proxy through a route handler in production.
- **React Server Components** — do not call these hooks in RSCs. They require a browser runtime (`fetch`, `FormData`, `URL.createObjectURL`).
- **React Native** — use [`@useknockout/node`](https://www.npmjs.com/package/@useknockout/node) instead; RN's `FormData` semantics differ enough that this package targets web only.

---

## License

MIT — see [LICENSE](./LICENSE).
