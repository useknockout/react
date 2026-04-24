// Public entry for @useknockout/react.

export { KnockoutProvider, useKnockoutConfig } from "./KnockoutProvider";
export type { KnockoutProviderProps } from "./KnockoutProvider";

export { useRemoveBackground } from "./useRemoveBackground";
export type {
  UseRemoveBackgroundOptions,
  UseRemoveBackgroundResult,
} from "./useRemoveBackground";

export { useReplaceBackground } from "./useReplaceBackground";
export type {
  UseReplaceBackgroundOptions,
  UseReplaceBackgroundResult,
} from "./useReplaceBackground";

export {
  DEFAULT_BASE_URL,
  KnockoutError,
  callRemove,
  callReplaceBackground,
  callHealth,
} from "./client";
export type {
  KnockoutConfig,
  OutputFormat,
  OpaqueFormat,
  ReplaceBackgroundInput,
} from "./client";
