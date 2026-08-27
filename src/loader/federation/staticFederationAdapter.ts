import type { MiniAppDefinition, MiniAppManifestEntry } from '@mboa/core';

import type { BundleDescriptor, FederationAdapter } from './types';

/** A container is a thunk so an on-demand Mini-App is only evaluated when needed. */
export type MiniAppContainer = () => Promise<MiniAppDefinition> | MiniAppDefinition;

export interface StaticFederationAdapterOptions {
  /** `remoteEntry` -> container. Registered by the shell at build time. */
  containers: Record<string, MiniAppContainer>;
  /**
   * Optional download step. The POC points this at the NestJS Command Center so
   * discovery and download are genuinely exercised end to end, even though the
   * container itself is already in the bundle.
   */
  fetchBundleDescriptor?: (entry: MiniAppManifestEntry) => Promise<BundleDescriptor>;
}

/**
 * Resolves Mini-Apps that are compiled into the shell.
 *
 * This is the adapter the POC runs on: it exercises the full Runtime Loader
 * pipeline (discover -> validate -> download -> load -> register -> rollback)
 * without requiring the Re.Pack/Rspack native toolchain.
 */
export function createStaticFederationAdapter(
  options: StaticFederationAdapterOptions,
): FederationAdapter {
  const { containers, fetchBundleDescriptor } = options;

  return {
    name: 'static',

    canResolve(entry) {
      return Object.prototype.hasOwnProperty.call(containers, entry.remoteEntry);
    },

    async resolve(entry) {
      // Simulated download -- proves the loader's network path without Re.Pack.
      if (fetchBundleDescriptor) {
        const descriptor = await fetchBundleDescriptor(entry);
        if (descriptor.version !== entry.version) {
          throw new Error(
            `Bundle ${entry.remoteEntry} served version ${descriptor.version}, manifest expected ${entry.version}`,
          );
        }
      }

      const container = containers[entry.remoteEntry];
      if (!container) {
        throw new Error(`No container registered for ${entry.remoteEntry}`);
      }

      const definition = await container();
      if (definition.id !== entry.id) {
        throw new Error(
          `Bundle ${entry.remoteEntry} exposes "${definition.id}", manifest declared "${entry.id}"`,
        );
      }

      return definition;
    },
  };
}
