/**
 * `useSmartCrop` — auto-crop to the subject bbox + padding from a File/Blob.
 *
 *   const { generate, dataUrl, isLoading, error, reset } = useSmartCrop();
 *   await generate(file, { padding: 32 });
 */
import { useCallback, useEffect, useRef, useState } from "react";
import {
  callSmartCrop,
  KnockoutError,
  type SmartCropInput,
  type KnockoutConfig,
  type OpaqueFormat,
} from "./client";
import { useKnockoutConfig } from "./KnockoutProvider";

export interface UseSmartCropOptions extends KnockoutConfig {
  /** Default format applied when `generate()` doesn't override. Default "png". */
  format?: OpaqueFormat;
}

export type SmartCropOptions = Omit<SmartCropInput, "file">;

export interface UseSmartCropResult {
  /** Run smart-crop on a file. Returns the resulting Blob. */
  generate: (file: File | Blob, options?: SmartCropOptions) => Promise<Blob>;
  data: Blob | null;
  dataUrl: string | null;
  isLoading: boolean;
  error: Error | KnockoutError | null;
  reset: () => void;
}

export function useSmartCrop(options: UseSmartCropOptions = {}): UseSmartCropResult {
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
    async (file: File | Blob, opts: SmartCropOptions = {}) => {
      setIsLoading(true);
      setError(null);
      try {
        const blob = await callSmartCrop(config, {
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
