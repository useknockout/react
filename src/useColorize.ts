/**
 * `useColorize` — DDColor image colorization.
 *
 *   const { colorize, dataUrl, isLoading, error, reset } = useColorize();
 *   await colorize(file);
 */
import { useCallback, useEffect, useRef, useState } from "react";
import {
  callColorize,
  KnockoutError,
  type ColorizeInput,
  type KnockoutConfig,
  type OpaqueFormat,
} from "./client";
import { useKnockoutConfig } from "./KnockoutProvider";

export interface UseColorizeOptions extends KnockoutConfig {
  format?: OpaqueFormat;
}

export type ColorizeOptions = Omit<ColorizeInput, "file">;

export interface UseColorizeResult {
  colorize: (file: File | Blob, options?: ColorizeOptions) => Promise<Blob>;
  data: Blob | null;
  dataUrl: string | null;
  isLoading: boolean;
  error: Error | KnockoutError | null;
  reset: () => void;
}

export function useColorize(options: UseColorizeOptions = {}): UseColorizeResult {
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

  const colorize = useCallback(
    async (file: File | Blob, opts: ColorizeOptions = {}) => {
      setIsLoading(true);
      setError(null);
      try {
        const blob = await callColorize(config, {
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

  return { colorize, data, dataUrl, isLoading, error, reset };
}
