/**
 * `useMask` — black/white subject mask from a File/Blob, for your own compositing.
 *
 *   const { generate, dataUrl, isLoading, error, reset } = useMask();
 *   await generate(file);
 */
import { useCallback, useEffect, useRef, useState } from "react";
import {
  callMask,
  KnockoutError,
  type MaskInput,
  type KnockoutConfig,
  type OutputFormat,
} from "./client";
import { useKnockoutConfig } from "./KnockoutProvider";

export interface UseMaskOptions extends KnockoutConfig {
  /** Default format applied when `generate()` doesn't override. Default "png". */
  format?: OutputFormat;
}

export type MaskOptions = Omit<MaskInput, "file">;

export interface UseMaskResult {
  /** Run mask extraction on a file. Returns the resulting Blob. */
  generate: (file: File | Blob, options?: MaskOptions) => Promise<Blob>;
  data: Blob | null;
  dataUrl: string | null;
  isLoading: boolean;
  error: Error | KnockoutError | null;
  reset: () => void;
}

export function useMask(options: UseMaskOptions = {}): UseMaskResult {
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

  const generate = useCallback(
    async (file: File | Blob, opts: MaskOptions = {}) => {
      setIsLoading(true);
      setError(null);
      try {
        const blob = await callMask(config, {
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

  return { generate, data, dataUrl, isLoading, error, reset };
}
