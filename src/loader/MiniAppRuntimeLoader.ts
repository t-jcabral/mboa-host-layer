import type {
  MiniAppDefinition,
  MiniAppLoadResult,
  MiniAppManifest,
  MiniAppManifestEntry,
} from '@mboa/core';

import type { FederationAdapter } from './federation/types';
import { satisfies } from './semver';

export interface RuntimeLoaderLogger {
  info(message: string, meta?: Record<string, unknown>): void;
  warn(message: string, meta?: Record<string, unknown>): void;
}

export interface MiniAppRuntimeLoaderOptions {
  /** Tried in order; the first adapter whose `canResolve` passes wins. */
  adapters: FederationAdapter[];
  /** Version of the shared runtime the shell ships. */
  hostRuntimeVersion: string;
  loadManifest: () => Promise<MiniAppManifest>;
  /**
   * Registration side effects -- injecting reducers, lifecycle hooks, telemetry.
   * Throwing here fails the entry and triggers the rollback path.
   */
  onRegister?: (definition: MiniAppDefinition) => void;
  logger?: RuntimeLoaderLogger;
  /** Injectable clock so durations stay deterministic in tests. */
  now?: () => number;
}

export interface RuntimeLoadOutcome {
  manifest: MiniAppManifest;
  results: MiniAppLoadResult[];
  /** Registry contents: everything that resolved and registered cleanly. */
  definitions: MiniAppDefinition[];
}

const noopLogger: RuntimeLoaderLogger = { info: () => {}, warn: () => {} };

/**
 * The v6 Runtime Loader.
 *
 * Owns the whole bundle lifecycle so Mini-Apps never download or register
 * themselves:
 *
 *   discover -> validate version -> download/load -> register -> rollback on failure
 */
export class MiniAppRuntimeLoader {
  private readonly options: Required<
    Pick<MiniAppRuntimeLoaderOptions, 'adapters' | 'hostRuntimeVersion' | 'loadManifest'>
  > &
    MiniAppRuntimeLoaderOptions;

  private readonly logger: RuntimeLoaderLogger;
  private readonly now: () => number;

  constructor(options: MiniAppRuntimeLoaderOptions) {
    this.options = options;
    this.logger = options.logger ?? noopLogger;
    this.now = options.now ?? (() => Date.now());
  }

  async load(): Promise<RuntimeLoadOutcome> {
    const manifest = await this.options.loadManifest();

    this.logger.info('Mini-App manifest resolved', {
      manifestVersion: manifest.manifestVersion,
      entries: manifest.miniApps.length,
    });

    const results: MiniAppLoadResult[] = [];

    // Sequential: registration mutates the shared store, and ordering keeps the
    // registry deterministic for navigation.
    for (const entry of manifest.miniApps) {
      results.push(await this.loadEntry(entry));
    }

    const definitions = results
      .filter((result) => result.definition !== undefined)
      .map((result) => result.definition as MiniAppDefinition);

    return { manifest, results, definitions };
  }

  private async loadEntry(entry: MiniAppManifestEntry): Promise<MiniAppLoadResult> {
    const startedAt = this.now();
    const finish = (result: Omit<MiniAppLoadResult, 'durationMs'>): MiniAppLoadResult => ({
      ...result,
      durationMs: this.now() - startedAt,
    });

    // 1. Kill switch -- the Command Center can withhold a Mini-App entirely.
    if (!entry.enabled) {
      this.logger.info(`Mini-App "${entry.id}" disabled by Command Center`);
      return finish({
        id: entry.id,
        status: 'skipped',
        reason: 'disabled by Command Center',
      });
    }

    // 2. Version compatibility against the host runtime.
    if (!satisfies(this.options.hostRuntimeVersion, entry.hostRuntimeRange)) {
      const reason = `host runtime ${this.options.hostRuntimeVersion} does not satisfy ${entry.hostRuntimeRange}`;
      this.logger.warn(`Mini-App "${entry.id}" incompatible`, { reason });

      const rolledBack = await this.tryRollback(entry, reason, finish);
      if (rolledBack) return rolledBack;

      return finish({ id: entry.id, status: 'skipped', reason });
    }

    // 3-5. Download, load and register the advertised version.
    try {
      const definition = await this.resolveAndRegister(entry, entry.version);
      this.logger.info(`Mini-App "${entry.id}" registered`, { version: entry.version });

      return finish({
        id: entry.id,
        status: 'registered',
        resolvedVersion: entry.version,
        definition,
      });
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Mini-App "${entry.id}" failed to load`, { reason });

      // 6. Rollback to the last known-good bundle.
      const rolledBack = await this.tryRollback(entry, reason, finish);
      if (rolledBack) return rolledBack;

      return finish({ id: entry.id, status: 'failed', reason });
    }
  }

  private async tryRollback(
    entry: MiniAppManifestEntry,
    originalReason: string,
    finish: (result: Omit<MiniAppLoadResult, 'durationMs'>) => MiniAppLoadResult,
  ): Promise<MiniAppLoadResult | null> {
    const { rollbackVersion } = entry;
    if (!rollbackVersion || rollbackVersion === entry.version) return null;

    this.logger.warn(`Rolling "${entry.id}" back to ${rollbackVersion}`, {
      from: entry.version,
      cause: originalReason,
    });

    try {
      const definition = await this.resolveAndRegister(entry, rollbackVersion);

      return finish({
        id: entry.id,
        status: 'rolled-back',
        resolvedVersion: rollbackVersion,
        definition,
        reason: originalReason,
      });
    } catch (error) {
      const rollbackReason = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Rollback of "${entry.id}" failed`, { reason: rollbackReason });

      return finish({
        id: entry.id,
        status: 'failed',
        reason: `${originalReason}; rollback to ${rollbackVersion} failed: ${rollbackReason}`,
      });
    }
  }

  private async resolveAndRegister(
    entry: MiniAppManifestEntry,
    version: string,
  ): Promise<MiniAppDefinition> {
    const versionedEntry: MiniAppManifestEntry = { ...entry, version };

    const adapter = this.options.adapters.find((candidate) =>
      candidate.canResolve(versionedEntry),
    );

    if (!adapter) {
      throw new Error(`No federation adapter can resolve "${entry.remoteEntry}"`);
    }

    const definition = await adapter.resolve(versionedEntry);

    // The bundle states its own host-runtime requirement; trust it over the
    // manifest, which can drift from what was actually shipped.
    if (
      definition.hostRuntimeRange &&
      !satisfies(this.options.hostRuntimeVersion, definition.hostRuntimeRange)
    ) {
      throw new Error(
        `bundle requires host runtime ${definition.hostRuntimeRange}, shell is ${this.options.hostRuntimeVersion}`,
      );
    }

    if (definition.version !== version) {
      throw new Error(`bundle reports version ${definition.version}, expected ${version}`);
    }

    this.options.onRegister?.(definition);

    return definition;
  }
}
