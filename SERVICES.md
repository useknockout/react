---
project: projects/useknockout-react
type: services
---

# Services

External hosted services this project depends on.

## Knockout API (background-removal / image-processing service)

- **What** — The hosted Knockout API that this SDK is a client for. Every image hook makes HTTPS
  requests to it (background removal, replace background, headshot, preview, upscale, face restore,
  colorize, silhouette, inpaint, studio shot, smart crop, sticker, outline, compare, mask) plus
  unauthenticated `/health`, `/stats`, and `/estimate` endpoints.
- **Default endpoint** — `https://useknockout--api.modal.run` (`DEFAULT_BASE_URL` in `src/client.ts`).
  Hosted on **Modal**. Overridable per provider/hook via `KnockoutConfig.baseUrl` for self-hosted
  deployments.
- **Authentication** — optional bearer token via `KnockoutConfig.token`, sent as
  `Authorization: Bearer <token>`. Required when the deployment has auth enabled.
- **Source / docs** — https://github.com/useknockout/api

## npm registry

- **What** — Public package registry where this SDK is published and from which consumers install it.
- **Package** — [`@useknockout/react`](https://www.npmjs.com/package/@useknockout/react), published
  with public access (`publishConfig.access: "public"`).
- **Used during** — distribution / installation, not at application runtime.

---

The SDK itself bundles **zero runtime dependencies** and contacts no other hosted services. The only
network calls it makes are to the Knockout API base URL described above.
