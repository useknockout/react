/**
 * `usePreview` — fast low-res cutout for UX progress indicators (~80ms warm).
 *
 *   const { generate, dataUrl, isLoading, error, reset } = usePreview();
 *   await generate(file, { maxDim: 384 });
 */
import { useCallback, useEffect, useRef, useState } from "react";
import {
  callPreview,
  KnockoutError,
  type KnockoutConfig,
  type OutputFormat,
  type PreviewInput,
} from "./client";
import { useKnockoutConfig } from "./KnockoutProvider";

export interface UsePreviewOptions extends KnockoutConfig {
  /** Default output format. Default "png". */
  format?: OutputFormat;
}

export type PreviewOptions = Omit<PreviewInput, "file">;

export interface UsePreviewResult {
  generate: (file: File | Blob, options?: PreviewOptions) => Promise<Blob>;
  data: Blob | null;
  dataUrl: string | null;
  isLoading: boolean;
  error: Error | KnockoutError | null;
  reset: () => void;
}

export function usePreview(options: UsePreviewOptions = {}): UsePreviewResult {
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
    async (file: File | Blob, opts: PreviewOptions = {}) => {
      setIsLoading(true);
      setError(null);
      try {
        const blob = await callPreview(config, {
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
