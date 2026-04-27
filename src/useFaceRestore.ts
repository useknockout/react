/**
 * `useFaceRestore` — GFPGAN portrait restoration.
 *
 *   const { restore, dataUrl, isLoading, error, reset } = useFaceRestore();
 *   await restore(file);
 */
import { useCallback, useEffect, useRef, useState } from "react";
import {
  callFaceRestore,
  KnockoutError,
  type FaceRestoreInput,
  type KnockoutConfig,
  type OpaqueFormat,
} from "./client";
import { useKnockoutConfig } from "./KnockoutProvider";

export interface UseFaceRestoreOptions extends KnockoutConfig {
  format?: OpaqueFormat;
}

export type FaceRestoreOptions = Omit<FaceRestoreInput, "file">;

export interface UseFaceRestoreResult {
  restore: (file: File | Blob, options?: FaceRestoreOptions) => Promise<Blob>;
  data: Blob | null;
  dataUrl: string | null;
  isLoading: boolean;
  error: Error | KnockoutError | null;
  reset: () => void;
}

export function useFaceRestore(options: UseFaceRestoreOptions = {}): UseFaceRestoreResult {
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

  const restore = useCallback(
    async (file: File | Blob, opts: FaceRestoreOptions = {}) => {
      setIsLoading(true);
      setError(null);
      try {
        const blob = await callFaceRestore(config, {
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

  return { restore, data, dataUrl, isLoading, error, reset };
}
