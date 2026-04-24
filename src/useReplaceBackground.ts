/**
 * `useReplaceBackground` — remove the background and composite onto a new one.
 *
 *   const { replaceBackground, data, dataUrl, isLoading, error, reset } = useReplaceBackground();
 *   await replaceBackground({ file, bgColor: "#FF5733", format: "jpg" });
 *   await replaceBackground({ file, bgUrl: "https://example.com/beach.jpg" });
 */
import { useCallback, useEffect, useRef, useState } from "react";
import {
  callReplaceBackground,
  KnockoutError,
  type KnockoutConfig,
  type OpaqueFormat,
  type ReplaceBackgroundInput,
} from "./client";
import { useKnockoutConfig } from "./KnockoutProvider";

export interface UseReplaceBackgroundOptions extends KnockoutConfig {
  /** Default output format. Overridable per-call. Default "png". */
  format?: OpaqueFormat;
}

export interface UseReplaceBackgroundResult {
  /** Run the replacement. Returns the Blob of the composited image. */
  replaceBackground: (input: ReplaceBackgroundInput) => Promise<Blob>;
  /** Most recent result Blob, or null. */
  data: Blob | null;
  /** Object URL for the most recent result. Revoked automatically on next call or unmount. */
  dataUrl: string | null;
  /** In-flight state. */
  isLoading: boolean;
  /** Last error, or null. */
  error: Error | KnockoutError | null;
  /** Clear state and revoke the active object URL. */
  reset: () => void;
}

export function useReplaceBackground(
  options: UseReplaceBackgroundOptions = {}
): UseReplaceBackgroundResult {
  const config = useKnockoutConfig(options);
  const defaultFormat = options.format ?? "png";

  const [data, setData] = useState<Blob | null>(null);
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | KnockoutError | null>(null);
  const activeUrlRef = useRef<string | null>(null);

  useEffect(() => {
    return () => {
      if (activeUrlRef.current) URL.revokeObjectURL(activeUrlRef.current);
    };
  }, []);

  const replaceBackground = useCallback(
    async (input: ReplaceBackgroundInput) => {
      setIsLoading(true);
      setError(null);
      try {
        const blob = await callReplaceBackground(config, {
          ...input,
          format: input.format ?? defaultFormat,
        });
        if (activeUrlRef.current) URL.revokeObjectURL(activeUrlRef.current);
        const nextUrl = URL.createObjectURL(blob);
        activeUrlRef.current = nextUrl;
        setData(blob);
        setDataUrl(nextUrl);
        return blob;
      } catch (e) {
        const err = e instanceof Error ? e : new Error(String(e));
        setError(err);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [config, defaultFormat]
  );

  const reset = useCallback(() => {
    if (activeUrlRef.current) {
      URL.revokeObjectURL(activeUrlRef.current);
      activeUrlRef.current = null;
    }
    setData(null);
    setDataUrl(null);
    setError(null);
    setIsLoading(false);
  }, []);

  return { replaceBackground, data, dataUrl, isLoading, error, reset };
}
