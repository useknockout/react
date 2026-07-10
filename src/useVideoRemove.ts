/**
 * `useVideoRemove` — video background removal from a File/Blob, with polling.
 *
 *   const { generate, job, progress, isLoading, error, reset } = useVideoRemove();
 *   const done = await generate(file, { format: "webm" });
 *   // done.result_url — signed download URL (valid ~1h)
 *
 * Paid tiers only; $0.05 per output second, billed on success.
 * Caps: 30s clip, 30fps processing, 200MB upload.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import {
  callVideoRemove,
  callGetJob,
  KnockoutError,
  type VideoRemoveInput,
  type VideoJob,
  type KnockoutConfig,
} from "./client";
import { useKnockoutConfig } from "./KnockoutProvider";

export interface UseVideoRemoveOptions extends KnockoutConfig {
  /** Poll interval in ms. Default 5000. */
  pollIntervalMs?: number;
  /** Overall wait ceiling in ms. Default 900000 (15 min). */
  waitTimeoutMs?: number;
}

export type VideoRemoveOptions = Omit<VideoRemoveInput, "file">;

export interface UseVideoRemoveResult {
  /** Submit a video and poll until done. Resolves with the final job (result_url set). */
  generate: (file: File | Blob, options?: VideoRemoveOptions) => Promise<VideoJob>;
  /** Latest job state (updates on every poll). */
  job: VideoJob | null;
  /** 0–100, from the latest poll. */
  progress: number;
  isLoading: boolean;
  error: Error | KnockoutError | null;
  reset: () => void;
}

export function useVideoRemove(options: UseVideoRemoveOptions = {}): UseVideoRemoveResult {
  const config = useKnockoutConfig(options);
  const pollInterval = options.pollIntervalMs ?? 5_000;
  const waitTimeout = options.waitTimeoutMs ?? 900_000;

  const [job, setJob] = useState<VideoJob | null>(null);
  const [progress, setProgress] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | KnockoutError | null>(null);
  const cancelledRef = useRef(false);

  useEffect(() => {
    return () => {
      cancelledRef.current = true; // stop polling after unmount
    };
  }, []);

  const generate = useCallback(
    async (file: File | Blob, opts: VideoRemoveOptions = {}) => {
      setIsLoading(true);
      setError(null);
      setProgress(0);
      try {
        let current = await callVideoRemove(config, { file, ...opts });
        setJob(current);
        const deadline = Date.now() + waitTimeout;
        while (current.status === "queued" || current.status === "processing") {
          if (cancelledRef.current) return current;
          if (Date.now() > deadline) {
            throw new Error(`video job ${current.job_id} still ${current.status} after wait timeout`);
          }
          await new Promise((r) => setTimeout(r, pollInterval));
          current = await callGetJob(config, current.job_id);
          setJob(current);
          setProgress(current.progress ?? 0);
        }
        if (current.status === "error") {
          throw new Error(`video job ${current.job_id} failed: ${current.error ?? "unknown error"}`);
        }
        setProgress(100);
        return current;
      } catch (e) {
        const err = e instanceof Error ? e : new Error(String(e));
        setError(err);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [config, pollInterval, waitTimeout]
  );

  const reset = useCallback(() => {
    setJob(null);
    setProgress(0);
    setError(null);
    setIsLoading(false);
  }, []);

  return { generate, job, progress, isLoading, error, reset };
}
