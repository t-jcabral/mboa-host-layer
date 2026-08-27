import type { MiniAppDefinition, MiniAppManifestEntry } from '@mboa/core';

/** Metadata returned by the bundle-download step before a container is evaluated. */
export interface BundleDescriptor {
  id: string;
  remoteEntry: string;
  version: string;
  /** Where the bundle would be fetched from. */
  url: string;
  sizeBytes?: number;
  integrity?: string;
}

/**
 * How the Runtime Loader turns a manifest entry into a live Mini-App.
 *
 * Two implementations ship:
 *  - `staticFederationAdapter`  -- containers compiled into the shell (runs today)
 *  - `repackFederationAdapter`  -- Re.Pack Module Federation (drop-in when adopted)
 *
 * The loader is written against this interface only, so switching bundling
 * strategies never touches Mini-App code or the registry.
 */
export interface FederationAdapter {
  readonly name: string;

  /** Whether this adapter can serve the entry. Checked in adapter order. */
  canResolve(entry: MiniAppManifestEntry): boolean;

  /**
   * Download (or locate) the bundle and evaluate its container, returning the
   * single entry point the Mini-App exposes.
   */
  resolve(entry: MiniAppManifestEntry): Promise<MiniAppDefinition>;
}
