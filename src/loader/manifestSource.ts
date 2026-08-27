import type { MiniAppManifest } from '@mboa/core';

export interface ManifestSourceOptions {
  /** Command Center endpoint serving the Mini-App manifest. */
  url: string;
  /** Compiled-in manifest used when the network is unavailable or disabled. */
  fallback: MiniAppManifest;
  /** When false the fallback is served without a network call. */
  remoteEnabled: boolean;
  timeoutMs?: number;
  onFallback?: (reason: string) => void;
}

/**
 * Bundle discovery.
 *
 * The app must still start when the Command Center is unreachable, so a failed
 * fetch degrades to the compiled-in manifest rather than blocking bootstrap.
 */
export function createManifestSource(
  options: ManifestSourceOptions,
): () => Promise<MiniAppManifest> {
  const { url, fallback, remoteEnabled, timeoutMs = 5_000, onFallback } = options;

  return async () => {
    if (!remoteEnabled) {
      onFallback?.('remote manifest disabled by configuration');
      return fallback;
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(`${url}/mini-apps/manifest`, {
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`Command Center responded ${response.status}`);
      }

      return (await response.json()) as MiniAppManifest;
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      onFallback?.(reason);
      return fallback;
    } finally {
      clearTimeout(timer);
    }
  };
}
