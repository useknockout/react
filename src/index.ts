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

export { useHeadshot } from "./useHeadshot";
export type {
  UseHeadshotOptions,
  UseHeadshotResult,
  HeadshotOptions,
} from "./useHeadshot";

export { usePreview } from "./usePreview";
export type {
  UsePreviewOptions,
  UsePreviewResult,
  PreviewOptions,
} from "./usePreview";

export { useStats } from "./useStats";
export type { UseStatsOptions, UseStatsResult } from "./useStats";

export {
  DEFAULT_BASE_URL,
  KnockoutError,
  callRemove,
  callReplaceBackground,
  callHealth,
  callStats,
  callEstimate,
  callHeadshot,
  callPreview,
} from "./client";
export type {
  KnockoutConfig,
  OutputFormat,
  OpaqueFormat,
  ReplaceBackgroundInput,
  HeadshotInput,
  PreviewInput,
  EstimateInput,
  EstimateResponse,
  StatsResponse,
  StatsDay,
} from "./client";
