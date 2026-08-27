import type { MiniAppDefinition, MiniAppManifestEntry } from '@mboa/core';

import {
  createWebMiniAppComponent,
  type WebViewComponent,
} from '../../web/WebMiniAppContainer';
import type { FederationAdapter } from './types';

export interface WebAppAdapterOptions {
  /** The app's react-native-webview component, injected like the storage engine. */
  WebView: WebViewComponent;
}

/**
 * Resolves Mini-Apps delivered as HOSTED WEB APPS ('web' delivery mode).
 *
 * No bundle, no container: the definition wraps the manifest's `webUrl` in the
 * secure WebView container. Shipping a new version of the web app needs no
 * app release at all — the Command Center flips the manifest entry.
 */
export function createWebAppAdapter(options: WebAppAdapterOptions): FederationAdapter {
  const { WebView } = options;

  return {
    name: 'web',

    canResolve(entry: MiniAppManifestEntry) {
      return entry.deliveryMode === 'web' && typeof entry.webUrl === 'string';
    },

    async resolve(entry: MiniAppManifestEntry): Promise<MiniAppDefinition> {
      return {
        id: entry.id,
        route: entry.route,
        version: entry.version,
        remoteEntry: entry.remoteEntry,
        title: entry.title,
        hostRuntimeRange: entry.hostRuntimeRange,
        deliveryMode: 'web',
        flags: entry.flags,
        component: createWebMiniAppComponent(entry, WebView),
      };
    },
  };
}
