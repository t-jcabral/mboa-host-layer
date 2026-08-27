import React, { useEffect } from 'react';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { persistor, setupApiListeners, store } from '@mboa/core';

import { MboaRuntimeProvider, type HostRuntimeOptions } from './runtime/MboaRuntimeContext';

export interface HostLayerProps {
  children: React.ReactNode;
  /**
   * Runtime Loader configuration. Omit it for a standalone Mini-App test host:
   * Redux, persistence and auth still run, but no registry is resolved.
   */
  runtime?: HostRuntimeOptions;
  /** Rendered while the persisted store rehydrates. */
  loading?: React.ReactNode;
}

/**
 * Mini App Runtime.
 *
 * Owns Redux, PersistGate, the Runtime Loader, the lifecycle manager and the
 * shared runtime context. It deliberately owns no application-specific
 * navigation -- that belongs to the Root Stack Mini-App.
 */
export function HostLayer({ children, runtime, loading = null }: HostLayerProps) {
  // Scoped to the Host's lifetime so the listeners are torn down with it.
  useEffect(() => setupApiListeners(), []);

  return (
    <Provider store={store}>
      <PersistGate loading={loading} persistor={persistor}>
        <MboaRuntimeProvider options={runtime}>{children}</MboaRuntimeProvider>
      </PersistGate>
    </Provider>
  );
}
