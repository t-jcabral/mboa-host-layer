import React, { useCallback, useMemo, useState, type ComponentType } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { MiniAppManifestEntry } from '@mboa/core';

/**
 * The slice of `react-native-webview` the container needs. Injected by the
 * app (like the storage engine), so this package carries no native dependency.
 */
export interface WebViewLikeProps {
  source: { uri: string };
  originWhitelist?: string[];
  injectedJavaScriptBeforeContentLoaded?: string;
  onMessage?: (event: { nativeEvent: { data: string } }) => void;
  onShouldStartLoadWithRequest?: (request: { url: string }) => boolean;
  style?: object;
}
export type WebViewComponent = ComponentType<WebViewLikeProps>;

interface BridgeMessage {
  type: string;
  payload?: unknown;
}

const originOf = (url: string): string => {
  const match = /^(https?:\/\/[^/]+)/.exec(url);
  return match?.[1] ?? url;
};

/**
 * Secure WebView container for the 'web' delivery mode.
 *
 * Security posture:
 *  - navigation is locked to the hosted app's own origin
 *  - the JS bridge is namespaced under `window.MBOA` and speaks JSON messages
 *  - the page receives only what the manifest declares (id, version, flags)
 *
 * The strip under the page surfaces the last bridge message, so the
 * native <-> web handshake is visible while testing.
 */
export function createWebMiniAppComponent(
  entry: MiniAppManifestEntry,
  WebView: WebViewComponent,
): ComponentType {
  const webUrl = entry.webUrl ?? '';
  const origin = originOf(webUrl);

  const injected = `
    window.MBOA = {
      miniAppId: ${JSON.stringify(entry.id)},
      version: ${JSON.stringify(entry.version)},
      flags: ${JSON.stringify(entry.flags ?? {})},
      postMessage: function (type, payload) {
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: type, payload: payload }));
      },
    };
    true;
  `;

  function WebMiniApp() {
    const [lastMessage, setLastMessage] = useState<string>('waiting for the web app…');

    const onMessage = useCallback((event: { nativeEvent: { data: string } }) => {
      try {
        const message = JSON.parse(event.nativeEvent.data) as BridgeMessage;
        setLastMessage(`${message.type} ${JSON.stringify(message.payload ?? '')}`);
      } catch {
        setLastMessage('unparseable bridge message');
      }
    }, []);

    const onShouldStartLoadWithRequest = useCallback(
      (request: { url: string }) => request.url.startsWith(origin),
      [],
    );

    const style = useMemo(() => ({ flex: 1 }), []);

    return (
      <View style={styles.container}>
        <WebView
          source={{ uri: webUrl }}
          originWhitelist={[origin]}
          injectedJavaScriptBeforeContentLoaded={injected}
          onMessage={onMessage}
          onShouldStartLoadWithRequest={onShouldStartLoadWithRequest}
          style={style}
        />
        <View style={styles.bridgeBar}>
          <Text style={styles.bridgeLabel}>{`JS bridge · ${lastMessage}`}</Text>
        </View>
      </View>
    );
  }

  return WebMiniApp;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#08101f' },
  bridgeBar: {
    borderTopWidth: 1,
    borderTopColor: '#2b3a59',
    backgroundColor: '#111c31',
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  bridgeLabel: { color: '#9eacc8', fontSize: 12 },
});
