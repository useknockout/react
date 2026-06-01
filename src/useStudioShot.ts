/**
 * `useStudioShot` — e-commerce product preset from a File/Blob.
 *
 *   const { generate, dataUrl, isLoading, error, reset } = useStudioShot();
 *   await generate(file, { aspect: "1:1", transparent: true });
 */
import { useCallback, useEffect, useRef, useState } from "react";
import {
  callStudioShot,
  KnockoutError,
  type StudioShotInput,
  type KnockoutConfig,
  type OpaqueFormat,
} from "./client";
import { useKnockoutConfig } from "./KnockoutProvider";

export interface UseStudioShotOptions extends KnockoutConfig {
  /** Default format applied when `generate()` doesn't override. Default "jpg". */
  format?: OpaqueFormat;
}

export type StudioShotOptions = Omit<StudioShotInput, "file">;

export interface UseStudioShotResult {
  /** Run the studio-shot preset on a file. Returns the resulting Blob. */
  generate: (file: File | Blob, options?: StudioShotOptions) => Promise<Blob>;
  data: Blob | null;
  dataUrl: string | null;
  isLoading: boolean;
  error: Error | KnockoutError | null;
  reset: () => void;
}

export function useStudioShot(options: UseStudioShotOptions = {}): UseStudioShotResult {
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
    async (file: File | Blob, opts: StudioShotOptions = {}) => {
      setIsLoading(true);
      setError(null);
      try {
        const blob = await callStudioShot(config, {
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
