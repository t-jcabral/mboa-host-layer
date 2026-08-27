import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { RuntimeBootstrapState, SerializableMiniAppLoadResult } from '@mboa/core';

export const MINI_APP_RUNTIME_SLICE = 'miniAppRuntime';

const initialState: RuntimeBootstrapState = {
  status: 'idle',
  hostRuntimeVersion: '0.0.0',
  results: [],
};

/**
 * Serializable view of the runtime for debugging, telemetry and the Command
 * Center. Resolved `MiniAppDefinition`s hold React components, so they stay in
 * React context and never enter Redux -- or a Redux action, which is why the
 * caller strips them rather than this reducer.
 */
const runtimeSlice = createSlice({
  name: MINI_APP_RUNTIME_SLICE,
  initialState,
  reducers: {
    bootstrapStarted(state, action: PayloadAction<{ hostRuntimeVersion: string }>) {
      state.status = 'bootstrapping';
      state.hostRuntimeVersion = action.payload.hostRuntimeVersion;
      state.results = [];
      state.error = undefined;
    },
    bootstrapSettled(
      state,
      action: PayloadAction<{
        manifestVersion: string;
        results: SerializableMiniAppLoadResult[];
      }>,
    ) {
      state.manifestVersion = action.payload.manifestVersion;
      state.results = action.payload.results;
      state.status = state.results.some(
        (result) => result.status === 'failed' || result.status === 'rolled-back',
      )
        ? 'degraded'
        : 'ready';
    },
    bootstrapFailed(state, action: PayloadAction<string>) {
      state.status = 'failed';
      state.error = action.payload;
    },
  },
});

export const { bootstrapStarted, bootstrapSettled, bootstrapFailed } = runtimeSlice.actions;
export const miniAppRuntimeReducer = runtimeSlice.reducer;

export const selectMiniAppRuntime = (state: Record<string, unknown>) =>
  (state[MINI_APP_RUNTIME_SLICE] as RuntimeBootstrapState | undefined) ?? initialState;
