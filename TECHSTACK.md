---
project: projects/useknockout-react
type: techstack
---

# Tech Stack

`@useknockout/react` is a lightweight, zero-runtime-dependency React SDK for the
[useknockout](https://github.com/useknockout/api) background-removal API. It ships a set of
React hooks and a context provider that wrap the Knockout HTTP endpoints.

## Languages

- **TypeScript** (`^5.6.0`) — the entire `src/` tree is authored in strict TypeScript with full type
  exports and no `any`s. Compiles to ES2020.
- **JavaScript (ESM + CJS)** — published build output. The package ships both an ES module
  (`dist/index.js`) and a CommonJS build (`dist/index.cjs`), each with matching `.d.ts` / `.d.cts`
  type declarations.

## Framework

- **React** (`>=18.0.0`, peer dependency) — the package exposes React hooks (`useRemoveBackground`,
  `useReplaceBackground`, `useHeadshot`, `usePreview`, `useStats`, `useUpscale`, `useFaceRestore`,
  `useColorize`, `useSilhouette`, `useInpaint`, `useStudioShot`, `useSmartCrop`, `useSticker`,
  `useOutline`, `useCompare`, `useMask`) and a `KnockoutProvider` context component. It uses only
  stable React APIs: `createContext`, `useContext`, `useMemo`, `useState`, `useEffect`,
  `useCallback`, `useRef`, and `createElement`. React is declared as a peer dependency (and externalized
  in the build) so the host app provides the single React instance.

## Runtime dependencies

**None.** The package has zero runtime dependencies. The HTTP client in `src/client.ts` relies only
on Web Platform globals:

- `fetch` — request transport (overridable via `KnockoutConfig.fetch` for SSR / edge runtimes).
- `FormData` — multipart upload of image files.
- `AbortController` / `setTimeout` — per-request timeout (default 60s).
- `URL.createObjectURL` / `URL.revokeObjectURL` — hooks turn result `Blob`s into object URLs and
  auto-revoke the previous one on each call and on unmount.

Because it leans on browser globals, the hooks must run in a browser runtime (not in React Server
Components). For Node use, the companion `@useknockout/node` package is recommended.

## Key dev dependencies (purpose)

| Dependency | Version | Purpose |
|---|---|---|
| `typescript` | `^5.6.0` | Type checking (`npm run typecheck` → `tsc --noEmit`) and declaration generation. |
| `tsup` | `^8.3.0` | Build/bundler. Produces dual ESM + CJS output with `.d.ts` types, source maps, and tree-shaking. |
| `react` | `^18.3.0` | Provided for local type checking and building (the real React is a peer dep). |
| `@types/react` | `^18.3.0` | React type definitions for development. |

## Build & publish tooling

- **Build** — `tsup` (config in `tsup.config.ts`): entry `src/index.ts`, formats `esm` + `cjs`,
  `dts: true`, `sourcemap: true`, `clean: true`, `target: "es2020"`, `treeshake: true`, with
  `react` and `react-dom` marked `external`. Output goes to `dist/`.
- **TypeScript config** — `tsconfig.json` drives type checking. `npm run typecheck` runs `tsc --noEmit`.
- **Package format** — `"type": "module"` with an `exports` map exposing `types` / `import` / `require`
  conditions. `main` → `dist/index.cjs`, `module` → `dist/index.js`, `types` → `dist/index.d.ts`.
- **Publish** — published to the **npm registry** as the public scoped package `@useknockout/react`
  (`publishConfig.access: "public"`). `prepublishOnly` runs `npm run build`; only `dist`, `README.md`,
  and `LICENSE` are included in the tarball (`files` + `.npmignore`).
- **Engines** — Node `>=18`.

## External APIs

- **Knockout API** — the hosted background-removal / image-processing service this SDK is a client for.
  Default base URL `https://useknockout--api.modal.run` (hosted on [Modal](https://modal.com);
  overridable via `KnockoutConfig.baseUrl` for self-hosted deployments). Authentication is an optional
  bearer token (`KnockoutConfig.token`, sent as `Authorization: Bearer <token>`).

  Endpoints consumed by the client (`src/client.ts`):
  `/remove`, `/replace-bg`, `/health`, `/stats`, `/estimate`, `/headshot`, `/preview`, `/upscale`,
  `/face-restore`, `/colorize`, `/inpaint`, `/silhouette`, `/studio-shot`, `/smart-crop`, `/sticker`,
  `/outline`, `/compare`, `/mask`. Non-2xx responses are surfaced as a typed `KnockoutError`
  (`status`, `code`, `body`), where `code` is one of `auth | rate_limit | bad_request |
  payload_too_large | server | unknown`.

  The underlying models referenced by the API include BiRefNet (segmentation), Swin2SR / Real-ESRGAN
  (super-resolution), GFPGAN (face restoration), DDColor (colorization), and LaMa (inpainting).

## License

MIT.
