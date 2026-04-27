/**
 * `useUpscale` — Real-ESRGAN x2/x4 super-resolution from a File/Blob.
 *
 *   const { upscale, dataUrl, isLoading, error, reset } = useUpscale();
 *   await upscale(file, { scale: 4 });
 */
import { useCallback, useEffect, useRef, useState } from "react";
import {
  callUpscale,
  KnockoutError,
  type KnockoutConfig,
  type OpaqueFormat,
  type UpscaleInput,
} from "./client";
import { useKnockoutConfig } from "./KnockoutProvider";

export interface UseUpscaleOptions extends KnockoutConfig {
  format?: OpaqueFormat;
}

export type UpscaleOptions = Omit<UpscaleInput, "file">;

export interface UseUpscaleResult {
  upscale: (file: File | Blob, options?: UpscaleOptions) => Promise<Blob>;
  data: Blob | null;
  dataUrl: string | null;
  isLoading: boolean;
  error: Error | KnockoutError | null;
  reset: () => void;
}

export function useUpscale(options: UseUpscaleOptions = {}): UseUpscaleResult {
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

  const upscale = useCallback(
    async (file: File | Blob, opts: UpscaleOptions = {}) => {
      setIsLoading(true);
      setError(null);
      try {
        const blob = await callUpscale(config, {
          file,
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

  return { upscale, data, dataUrl, isLoading, error, reset };
}
