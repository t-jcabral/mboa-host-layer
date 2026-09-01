import { useSyncExternalStore } from 'react';

import {
  getHostCapabilities,
  subscribeToHostCapabilities,
  type HostCapabilities,
} from './hostCapabilities';

/**
 * Read the host's capabilities from a Mini-App (call it in a ViewModel,
 * never in a component):
 *
 *   const { location } = useHostCapabilities();
 *   // location === false → hide the map tab, show the list instead
 *
 * Re-renders if the host reconfigures capabilities at runtime.
 */
export function useHostCapabilities(): HostCapabilities {
  return useSyncExternalStore(
    subscribeToHostCapabilities,
    getHostCapabilities,
    getHostCapabilities,
  );
}
