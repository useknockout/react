/**
 * Provider + hook for scoping Knockout config to a React subtree.
 *
 *   <KnockoutProvider token={process.env.NEXT_PUBLIC_KNOCKOUT_TOKEN!}>
 *     <App />
 *   </KnockoutProvider>
 *
 *   // then anywhere below:
 *   const { remove } = useRemoveBackground();
 */
import { createContext, createElement, useContext, useMemo } from "react";
import type { ReactNode } from "react";
import type { KnockoutConfig } from "./client";

const KnockoutContext = createContext<KnockoutConfig | null>(null);

export interface KnockoutProviderProps extends KnockoutConfig {
  children: ReactNode;
}

export function KnockoutProvider({
  children,
  token,
  baseUrl,
  timeoutMs,
  fetch: fetchImpl,
}: KnockoutProviderProps) {
  const value = useMemo<KnockoutConfig>(
    () => ({ token, baseUrl, timeoutMs, fetch: fetchImpl }),
    [token, baseUrl, timeoutMs, fetchImpl]
  );
  return createElement(KnockoutContext.Provider, { value }, children);
}

/**
 * Resolve the effective KnockoutConfig for a hook call:
 * provider context merged with any per-hook overrides.
 */
export function useKnockoutConfig(override: KnockoutConfig = {}): KnockoutConfig {
  const ctx = useContext(KnockoutContext);
  return { ...(ctx ?? {}), ...override };
}
