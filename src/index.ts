export { HostLayer, type HostLayerProps } from './HostLayer';

export { registerMiniApp } from './runtime/registerMiniApp';
export {
  configureHostCapabilities,
  getHostCapabilities,
  resetHostCapabilities,
  subscribeToHostCapabilities,
  type HostCapabilities,
} from './capabilities/hostCapabilities';
export { useHostCapabilities } from './capabilities/useHostCapabilities';
export {
  MboaRuntimeProvider,
  useMboaRuntime,
  useMiniAppFlags,
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
  createWebAppAdapter,
  type WebAppAdapterOptions,
} from './loader/federation/webAppAdapter';
export {
  createWebMiniAppComponent,
  type WebViewComponent,
  type WebViewLikeProps,
} from './web/WebMiniAppContainer';
export {
  createRepackFederationAdapter,
  type RepackFederationAdapterOptions,
  type RepackRuntimeBindings,
} from './loader/federation/repackFederationAdapter';

// ---- Lifecycle -------------------------------------------------------------
export { miniAppLifecycle, type MiniAppLifecycleHooks } from './lifecycle/miniAppLifecycle';
