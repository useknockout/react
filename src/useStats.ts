/**
 * `useStats` — live public usage counter (total + today + 7-day breakdown).
 *
 * Polls every `pollInterval` ms (default 30s). Pass `pollInterval: 0` to fetch once.
 * Useful for landing-page social proof: "X images processed today".
 *
 *   const { data, isLoading, error, refresh } = useStats();
 *   <div>{data?.total_processed.toLocaleString()} images processed</div>
 */
import { useCallback, useEffect, useRef, useState } from "react";
import {
  callStats,
  KnockoutError,
  type KnockoutConfig,
  type StatsResponse,
} from "./client";
import { useKnockoutConfig } from "./KnockoutProvider";

export interface UseStatsOptions extends KnockoutConfig {
  /** Auto-refresh interval in ms. 0 disables polling. Default 30_000. */
  pollInterval?: number;
}

export interface UseStatsResult {
  data: StatsResponse | null;
  isLoading: boolean;
  error: Error | KnockoutError | null;
  refresh: () => Promise<StatsResponse>;
}

export function useStats(options: UseStatsOptions = {}): UseStatsResult {
  const config = useKnockoutConfig(options);
  const pollInterval = options.pollInterval ?? 30_000;

  const [data, setData] = useState<StatsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | KnockoutError | null>(null);
  const mountedRef = useRef(true);

  const refresh = useCallback(async (): Promise<StatsResponse> => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await callStats(config);
      if (mountedRef.current) setData(result);
      return result;
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e));
      if (mountedRef.current) setError(err);
      throw err;
    } finally {
      if (mountedRef.current) setIsLoading(false);
    }
  }, [config]);

  useEffect(() => {
    mountedRef.current = true;
    refresh().catch(() => undefined);

    if (pollInterval <= 0) {
      return () => {
        mountedRef.current = false;
      };
    }
    const id = setInterval(() => {
      refresh().catch(() => undefined);
    }, pollInterval);
    return () => {
      mountedRef.current = false;
      clearInterval(id);
    };
  }, [refresh, pollInterval]);

  return { data, isLoading, error, refresh };
}
