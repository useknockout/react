/**
 * `useInpaint` — LaMa-based inpainting hook.
 *
 *   const { inpaint, dataUrl, isLoading, error, reset } = useInpaint();
 *
 *   // Auto-erase subject:
 *   await inpaint(file);
 *
 *   // Erase a rectangular region:
 *   await inpaint(file, { bbox: { x: 100, y: 100, w: 300, h: 400 } });
 *
 *   // Erase a custom mask:
 *   await inpaint(file, { mask: maskBlob });
 */
import { useCallback, useEffect, useRef, useState } from "react";
import {
  callInpaint,
  KnockoutError,
  type InpaintInput,
  type KnockoutConfig,
  type OpaqueFormat,
} from "./client";
import { useKnockoutConfig } from "./KnockoutProvider";

export interface UseInpaintOptions extends KnockoutConfig {
  format?: OpaqueFormat;
}

export type InpaintOptions = Omit<InpaintInput, "file">;

export interface UseInpaintResult {
  inpaint: (file: File | Blob, options?: InpaintOptions) => Promise<Blob>;
  data: Blob | null;
  dataUrl: string | null;
  isLoading: boolean;
  error: Error | KnockoutError | null;
  reset: () => void;
}

export function useInpaint(options: UseInpaintOptions = {}): UseInpaintResult {
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

  const inpaint = useCallback(
    async (file: File | Blob, opts: InpaintOptions = {}) => {
      setIsLoading(true);
      setError(null);
      try {
        const blob = await callInpaint(config, {
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

  return { inpaint, data, dataUrl, isLoading, error, reset };
}
