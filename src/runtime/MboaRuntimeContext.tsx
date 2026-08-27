import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  addPersistedKey,
  getMboaConfig,
  injectReducer,
  useAppDispatch,
  type MiniAppDefinition,
  type MiniAppLoadResult,
  type MiniAppManifest,
} from '@mboa/core';

import { miniAppLifecycle } from '../lifecycle/miniAppLifecycle';
import { MiniAppRuntimeLoader } from '../loader/MiniAppRuntimeLoader';
import { createManifestSource } from '../loader/manifestSource';
import type { FederationAdapter } from '../loader/federation/types';
import {
  MINI_APP_RUNTIME_SLICE,
  bootstrapFailed,
  bootstrapSettled,
  bootstrapStarted,
  miniAppRuntimeReducer,
} from './runtimeSlice';

export interface HostRuntimeOptions {
  /** Federation adapters, tried in order. */
  adapters: FederationAdapter[];
  /** Compiled-in manifest used when the Command Center is unreachable. */
  fallbackManifest: MiniAppManifest;
}

export interface MboaRuntimeValue {
  status: 'idle' | 'bootstrapping' | 'ready' | 'degraded' | 'failed';
  /** The Mini-App registry: everything that resolved and registered. */
  miniApps: MiniAppDefinition[];
  results: MiniAppLoadResult[];
  hostRuntimeVersion: string;
  error?: string;
  reload: () => void;
}

const MboaRuntimeContext = createContext<MboaRuntimeValue | null>(null);

export function useMboaRuntime(): MboaRuntimeValue {
  const value = useContext(MboaRuntimeContext);
  if (!value) {
    throw new Error('useMboaRuntime must be used inside <HostLayer>');
  }
  return value;
}

/**
 * The Command Center's feature flags for one Mini-App.
 *
 * Standalone harnesses have no registry, so callers destructure with their own
 * defaults: `const { showRatings = true } = useMiniAppFlags('marketplace')`.
 */
export function useMiniAppFlags(miniAppId: string): Record<string, boolean> {
  const { miniApps } = useMboaRuntime();
  return miniApps.find((app) => app.id === miniAppId)?.flags ?? {};
}

export interface MboaRuntimeProviderProps {
  children: React.ReactNode;
  options?: HostRuntimeOptions;
}

/**
 * Shared Runtime Context.
 *
 * Drives the Runtime Loader and exposes the resulting Mini-App registry.
 * Without `options` it stays inert, which is what a standalone Mini-App test
 * host wants.
 */
export function MboaRuntimeProvider({ children, options }: MboaRuntimeProviderProps) {
  const dispatch = useAppDispatch();
  const config = getMboaConfig();

  const [miniApps, setMiniApps] = useState<MiniAppDefinition[]>([]);
  const [results, setResults] = useState<MiniAppLoadResult[]>([]);
  const [status, setStatus] = useState<MboaRuntimeValue['status']>('idle');
  const [error, setError] = useState<string | undefined>();
  const [reloadToken, setReloadToken] = useState(0);

  // Runtime telemetry lives in Redux, so it is injected before the first load.
  const runtimeSliceInjected = useRef(false);
  if (!runtimeSliceInjected.current) {
    injectReducer(MINI_APP_RUNTIME_SLICE, miniAppRuntimeReducer);
    runtimeSliceInjected.current = true;
  }

  const reload = useCallback(() => setReloadToken((token) => token + 1), []);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      setStatus('bootstrapping');
      setError(undefined);
      dispatch(bootstrapStarted({ hostRuntimeVersion: config.hostRuntimeVersion }));

      try {
        // No runtime options means no registry to resolve: the standalone test
        // host mounts a Mini-App stack directly.
        if (!options) {
          setStatus('ready');
          return;
        }

        const loader = new MiniAppRuntimeLoader({
          adapters: options.adapters,
          hostRuntimeVersion: config.hostRuntimeVersion,
          loadManifest: createManifestSource({
            url: config.commandCenterUrl,
            fallback: options.fallbackManifest,
            remoteEnabled: config.remoteManifestEnabled,
            onFallback: (reason) =>
              console.warn(`[mboa] using compiled-in manifest: ${reason}`),
          }),
          onRegister: (definition) => {
            // A Mini-App owns its state; the Host installs it into the shared store.
            for (const key of definition.persistedReducerKeys ?? []) {
              addPersistedKey(key);
            }
            for (const [key, reducer] of Object.entries(definition.reducers ?? {})) {
              injectReducer(key, reducer);
            }
            miniAppLifecycle.registered(definition);
          },
          logger: {
            info: (message, meta) => console.log(`[mboa-runtime] ${message}`, meta ?? ''),
            warn: (message, meta) => console.warn(`[mboa-runtime] ${message}`, meta ?? ''),
          },
        });

        const outcome = await loader.load();
        if (cancelled) return;

        setMiniApps(outcome.definitions);
        setResults(outcome.results);

        // Drop the resolved definitions before they reach Redux: they hold
        // React components, which must not appear in an action or in state.
        dispatch(
          bootstrapSettled({
            manifestVersion: outcome.manifest.manifestVersion,
            results: outcome.results.map(
              ({ definition: _definition, ...serializable }) => serializable,
            ),
          }),
        );

        const degraded = outcome.results.some(
          (result) => result.status === 'failed' || result.status === 'rolled-back',
        );
        setStatus(degraded ? 'degraded' : 'ready');
      } catch (caught) {
        if (cancelled) return;
        const reason = caught instanceof Error ? caught.message : String(caught);
        setError(reason);
        setStatus('failed');
        dispatch(bootstrapFailed(reason));
      }
    };

    void run();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [options, reloadToken]);

  const value = useMemo<MboaRuntimeValue>(
    () => ({
      status,
      miniApps,
      results,
      hostRuntimeVersion: config.hostRuntimeVersion,
      error,
      reload,
    }),
    [status, miniApps, results, config.hostRuntimeVersion, error, reload],
  );

  return (
    <MboaRuntimeContext.Provider value={value}>{children}</MboaRuntimeContext.Provider>
  );
}
