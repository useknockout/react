/**
 * `useSticker` — thick contour outline on a transparent bg from a File/Blob.
 *
 *   const { generate, dataUrl, isLoading, error, reset } = useSticker();
 *   await generate(file, { strokeWidth: 24 });
 */
import { useCallback, useEffect, useRef, useState } from "react";
import {
  callSticker,
  KnockoutError,
  type StickerInput,
  type KnockoutConfig,
  type OutputFormat,
} from "./client";
import { useKnockoutConfig } from "./KnockoutProvider";

export interface UseStickerOptions extends KnockoutConfig {
  /** Default format applied when `generate()` doesn't override. Default "png". */
  format?: OutputFormat;
}

export type StickerOptions = Omit<StickerInput, "file">;

export interface UseStickerResult {
  /** Run the sticker preset on a file. Returns the resulting Blob. */
  generate: (file: File | Blob, options?: StickerOptions) => Promise<Blob>;
  data: Blob | null;
  dataUrl: string | null;
  isLoading: boolean;
  error: Error | KnockoutError | null;
  reset: () => void;
}

export function useSticker(options: UseStickerOptions = {}): UseStickerResult {
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
    async (file: File | Blob, opts: StickerOptions = {}) => {
      setIsLoading(true);
      setError(null);
      try {
        const blob = await callSticker(config, {
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
