import { addPersistedKey, injectReducer, type MiniAppDefinition } from '@mboa/core';

import { miniAppLifecycle } from '../lifecycle/miniAppLifecycle';

/**
 * Installs a Mini-App into the shared runtime: persisted keys, reducers,
 * lifecycle. Idempotent — re-registering the same Mini-App is a no-op.
 *
 * The Runtime Loader calls this for registry-driven hosts. Hosts that import
 * a Mini-App DIRECTLY (the existing Metrobank app navigating straight into
 * one) get the same registration through <MiniAppScreen>.
 */
export function registerMiniApp(definition: MiniAppDefinition): void {
  for (const key of definition.persistedReducerKeys ?? []) {
    addPersistedKey(key);
  }
  for (const [key, reducer] of Object.entries(definition.reducers ?? {})) {
    injectReducer(key, reducer);
  }
  miniAppLifecycle.registered(definition);
}
