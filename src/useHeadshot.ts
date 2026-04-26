/**
 * `useHeadshot` — generate a LinkedIn-ready portrait from a File/Blob.
 *
 *   const { generate, dataUrl, isLoading, error, reset } = useHeadshot();
 *   await generate(file, { bgColor: "#0A0A0A", aspect: "4:5" });
 */
import { useCallback, useEffect, useRef, useState } from "react";
import {
  callHeadshot,
  KnockoutError,
  type HeadshotInput,
  type KnockoutConfig,
  type OpaqueFormat,
} from "./client";
import { useKnockoutConfig } from "./KnockoutProvider";

export interface UseHeadshotOptions extends KnockoutConfig {
  /** Default format applied when `generate()` doesn't override. Default "jpg". */
  format?: OpaqueFormat;
}

export type HeadshotOptions = Omit<HeadshotInput, "file">;

export interface UseHeadshotResult {
  /** Run the headshot preset on a file. Returns the resulting Blob. */
  generate: (file: File | Blob, options?: HeadshotOptions) => Promise<Blob>;
  data: Blob | null;
  dataUrl: string | null;
  isLoading: boolean;
  error: Error | KnockoutError | null;
  reset: () => void;
}

export function useHeadshot(options: UseHeadshotOptions = {}): UseHeadshotResult {
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
    async (file: File | Blob, opts: HeadshotOptions = {}) => {
      setIsLoading(true);
      setError(null);
      try {
        const blob = await callHeadshot(config, {
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
