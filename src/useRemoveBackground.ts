/**
 * `useRemoveBackground` — remove the background from a File/Blob in the browser.
 *
 *   const { remove, data, dataUrl, isLoading, error, reset } = useRemoveBackground();
 *   await remove(file);
 */
import { useCallback, useEffect, useRef, useState } from "react";
import {
  callRemove,
  KnockoutError,
  type KnockoutConfig,
  type OutputFormat,
} from "./client";
import { useKnockoutConfig } from "./KnockoutProvider";

export interface UseRemoveBackgroundOptions extends KnockoutConfig {
  /** Output format. Default "png". */
  format?: OutputFormat;
}

export interface UseRemoveBackgroundResult {
  /** Run background removal. Returns the Blob of the result. */
  remove: (file: File | Blob) => Promise<Blob>;
  /** The most recent result Blob, or null. */
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

export function useRemoveBackground(
  options: UseRemoveBackgroundOptions = {}
): UseRemoveBackgroundResult {
  const config = useKnockoutConfig(options);
  const format = options.format ?? "png";

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

  const remove = useCallback(
    async (file: File | Blob) => {
      setIsLoading(true);
      setError(null);
      try {
        const blob = await callRemove(config, file, format);
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
    [config, format]
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

  return { remove, data, dataUrl, isLoading, error, reset };
}
