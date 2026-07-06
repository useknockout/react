/**
 * `useCollage` — product collage from 2–9 File/Blob images.
 *
 *   const { generate, dataUrl, isLoading, error, reset } = useCollage();
 *   await generate([main, acc1, acc2], { mainPosition: "BR" });
 *
 * Paid tiers only; billed at N base-image units (each photo is a full model pass).
 */
import { useCallback, useEffect, useRef, useState } from "react";
import {
  callCollage,
  KnockoutError,
  type CollageInput,
  type KnockoutConfig,
  type OpaqueFormat,
} from "./client";
import { useKnockoutConfig } from "./KnockoutProvider";

export interface UseCollageOptions extends KnockoutConfig {
  /** Default format applied when `generate()` doesn't override. Default "jpg". */
  format?: OpaqueFormat;
}

export type CollageOptions = Omit<CollageInput, "files">;

export interface UseCollageResult {
  /** Run the collage on 2–9 files. Returns the resulting Blob. */
  generate: (files: (File | Blob)[], options?: CollageOptions) => Promise<Blob>;
  data: Blob | null;
  dataUrl: string | null;
  isLoading: boolean;
  error: Error | KnockoutError | null;
  reset: () => void;
}

export function useCollage(options: UseCollageOptions = {}): UseCollageResult {
  const config = useKnockoutConfig(options);
  const defaultFormat = options.format ?? "jpg";

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

  const generate = useCallback(
    async (files: (File | Blob)[], opts: CollageOptions = {}) => {
      setIsLoading(true);
      setError(null);
      try {
        const blob = await callCollage(config, {
          files,
          format: defaultFormat,
          ...opts,
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

  return { generate, data, dataUrl, isLoading, error, reset };
}
