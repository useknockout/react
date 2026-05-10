/**
 * `useSilhouette` — two-tone silhouette portrait.
 *
 *   const { silhouette, dataUrl, isLoading, error, reset } = useSilhouette();
 *   await silhouette(file, { subjectColor: "#1E2960", bgColor: "#F0857C" });
 */
import { useCallback, useEffect, useRef, useState } from "react";
import {
  callSilhouette,
  KnockoutError,
  type SilhouetteInput,
  type KnockoutConfig,
  type OpaqueFormat,
} from "./client";
import { useKnockoutConfig } from "./KnockoutProvider";

export interface UseSilhouetteOptions extends KnockoutConfig {
  format?: OpaqueFormat;
}

export type SilhouetteOptions = Omit<SilhouetteInput, "file">;

export interface UseSilhouetteResult {
  silhouette: (file: File | Blob, options?: SilhouetteOptions) => Promise<Blob>;
  data: Blob | null;
  dataUrl: string | null;
  isLoading: boolean;
  error: Error | KnockoutError | null;
  reset: () => void;
}

export function useSilhouette(options: UseSilhouetteOptions = {}): UseSilhouetteResult {
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

  const silhouette = useCallback(
    async (file: File | Blob, opts: SilhouetteOptions = {}) => {
      setIsLoading(true);
      setError(null);
      try {
        const blob = await callSilhouette(config, {
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

  return { silhouette, data, dataUrl, isLoading, error, reset };
}
