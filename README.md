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

Studio-quality professional headshot — background removed, neutral studio backdrop, optional drop shadow, smart bust crop.

```tsx
const { headshot, dataUrl, isLoading } = useHeadshot();

await headshot({ file, bgColor: "#f5f5f5", crop: "bust" });
```

**`input` shape:** `{ file, bgColor?, addShadow?, crop?: "bust" | "head" | "full", format? }`

### `usePreview(options?)` — v0.4.0

Cheap, fast low-res preview (~1.5s, 512px max). Use for thumbnail UI before triggering full-res request.

```tsx
const { preview, dataUrl, isLoading } = usePreview();

await preview({ file, maxSize: 512, watermark: false });
```

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
```

**`input` shape:** `{ file, scale?: 2 | 4, model?: "swin2sr" | "realesrgan", format?: "png" | "webp" | "jpg" }`

### `useFaceRestore(options?)` — v0.5.0

**GFPGAN v1.4 face restoration.** Restores blurred/compressed faces while preserving identity. Multi-face safe; background also upscaled.

```tsx
const { faceRestore, dataUrl, isLoading } = useFaceRestore();

await faceRestore({ file });
```

**`input` shape:** `{ file, format?: "png" | "webp" | "jpg" }`

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

## Framework notes

- **Next.js App Router** — the provider and hooks work in any `"use client"` component. Keep `NEXT_PUBLIC_KNOCKOUT_TOKEN` in env for prototyping, or proxy through a route handler in production.
- **React Server Components** — do not call these hooks in RSCs. They require a browser runtime (`fetch`, `FormData`, `URL.createObjectURL`).
- **React Native** — use [`@useknockout/node`](https://www.npmjs.com/package/@useknockout/node) instead; RN's `FormData` semantics differ enough that this package targets web only.

---

## License

MIT — see [LICENSE](./LICENSE).
