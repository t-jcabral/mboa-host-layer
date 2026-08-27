export { HostLayer, type HostLayerProps } from './HostLayer';

export {
  MboaRuntimeProvider,
  useMboaRuntime,
  type HostRuntimeOptions,
  type MboaRuntimeValue,
} from './runtime/MboaRuntimeContext';

export {
  MINI_APP_RUNTIME_SLICE,
  miniAppRuntimeReducer,
  selectMiniAppRuntime,
} from './runtime/runtimeSlice';

export {
  createAsyncStorageEngine,
  type AsyncStorageLike,
} from './runtime/asyncStorageEngine';

// ---- Runtime Loader --------------------------------------------------------
export {
  MiniAppRuntimeLoader,
  type MiniAppRuntimeLoaderOptions,
  type RuntimeLoadOutcome,
  type RuntimeLoaderLogger,
} from './loader/MiniAppRuntimeLoader';
export { createManifestSource, type ManifestSourceOptions } from './loader/manifestSource';
export { satisfies, parseVersion, compareVersions, type SemVer } from './loader/semver';

// ---- Federation adapters ---------------------------------------------------
export type { FederationAdapter, BundleDescriptor } from './loader/federation/types';
export {
  createStaticFederationAdapter,
  type MiniAppContainer,
  type StaticFederationAdapterOptions,
} from './loader/federation/staticFederationAdapter';
export {
  createRepackFederationAdapter,
  type RepackFederationAdapterOptions,
  type RepackRuntimeBindings,
} from './loader/federation/repackFederationAdapter';

// ---- Lifecycle -------------------------------------------------------------
export { miniAppLifecycle, type MiniAppLifecycleHooks } from './lifecycle/miniAppLifecycle';
