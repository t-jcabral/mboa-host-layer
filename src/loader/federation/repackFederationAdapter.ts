import type { MiniAppDefinition, MiniAppManifestEntry } from '@mboa/core';

import type { FederationAdapter } from './types';

/**
 * The slice of the Re.Pack / Module Federation runtime this adapter needs.
 *
 * Passed in rather than imported so the package carries no hard dependency on
 * `@callstack/repack`. Nothing here is bundled until the team adopts Re.Pack.
 *
 * Wiring it up in the shell is one call:
 *
 * ```ts
 * import { ScriptManager, Script } from '@callstack/repack/client';
 * import { loadRemote } from '@module-federation/enhanced/runtime';
 *
 * createRepackFederationAdapter({
 *   bindings: {
 *     addResolver: (resolve) =>
 *       ScriptManager.shared.addResolver(async (scriptId, caller) => {
 *         const resolved = await resolve(scriptId, caller);
 *         return resolved ? { url: Script.getRemoteURL(resolved.url) } : undefined;
 *       }),
 *     loadRemote: (remoteEntry, exposedModule) =>
 *       loadRemote(`${remoteEntry}/${exposedModule}`),
 *     invalidateScripts: (ids) => ScriptManager.shared.invalidateScripts(ids),
 *   },
 *   resolveBundleUrl: (entry) =>
 *     `${cdnBaseUrl}/${entry.remoteEntry}@${entry.version}.bundle`,
 * });
 * ```
 */
export interface RepackRuntimeBindings {
  /** Teaches the script manager where a remote bundle lives. */
  addResolver(
    resolve: (scriptId: string, caller?: string) => Promise<{ url: string } | undefined>,
  ): void;
  /** Downloads (or reuses) a container and returns one exposed module. */
  loadRemote<T>(remoteEntry: string, exposedModule: string): Promise<T>;
  /** Evicts cached bundles so a rollback re-downloads rather than reusing. */
  invalidateScripts?(scriptIds: string[]): Promise<void>;
}

export interface RepackFederationAdapterOptions {
  bindings: RepackRuntimeBindings;
  /** Maps a manifest entry to the URL its versioned bundle is served from. */
  resolveBundleUrl: (entry: MiniAppManifestEntry) => string;
  /** Module the Mini-App exposes. Convention: every Mini-App exposes exactly one. */
  exposedModule?: string;
}

/**
 * Resolves Mini-Apps as independently deployed Re.Pack Module Federation
 * bundles. The Runtime Loader treats it identically to the static adapter --
 * that interchangeability is the point of the contract.
 */
export function createRepackFederationAdapter(
  options: RepackFederationAdapterOptions,
): FederationAdapter {
  const { bindings, resolveBundleUrl, exposedModule = './MiniApp' } = options;

  // Versioned URLs are registered as entries are resolved, so a rollback can
  // point the same scriptId at a different version.
  const urlByRemoteEntry = new Map<string, string>();

  bindings.addResolver(async (scriptId) => {
    const url = urlByRemoteEntry.get(scriptId);
    return url ? { url } : undefined;
  });

  return {
    name: 'repack',

    canResolve(entry) {
      // Bundled Mini-Apps ship with the shell; federation only serves remotes.
      return !entry.bundled;
    },

    async resolve(entry) {
      const url = resolveBundleUrl(entry);
      const previousUrl = urlByRemoteEntry.get(entry.remoteEntry);

      // A rollback reuses the scriptId at a new URL, so evict the cached bundle.
      if (previousUrl && previousUrl !== url && bindings.invalidateScripts) {
        await bindings.invalidateScripts([entry.remoteEntry]);
      }

      urlByRemoteEntry.set(entry.remoteEntry, url);

      const loaded = await bindings.loadRemote<
        MiniAppDefinition | { default: MiniAppDefinition }
      >(entry.remoteEntry, exposedModule);

      const definition =
        'default' in loaded ? loaded.default : (loaded as MiniAppDefinition);

      if (definition.id !== entry.id) {
        throw new Error(
          `Remote ${entry.remoteEntry} exposes "${definition.id}", manifest declared "${entry.id}"`,
        );
      }

      return definition;
    },
  };
}
