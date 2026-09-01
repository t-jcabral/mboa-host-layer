/**
 * Host capabilities — what the HOST BINARY can actually do right now.
 *
 * Permissions and native modules compile into the host app, so a Mini-App
 * that needs a new one must wait for a host release. This registry lets a
 * Mini-App ship AHEAD of that release with the feature dark, and light up
 * automatically once the host catches up:
 *
 *   const { camera } = useHostCapabilities();
 *   if (!camera) return <UploadFromGallery />;   // graceful degradation
 *
 * The host declares what it has once at bootstrap; Mini-Apps only read.
 */
export interface HostCapabilities {
  /** Camera permission + a camera module are present. */
  camera: boolean;
  /** Location permission is present. */
  location: boolean;
  /** Photo library access is present. */
  photoLibrary: boolean;
  /** Push notification entitlement is present. */
  notifications: boolean;
  /** Biometric (Face ID / fingerprint) support is present. */
  biometrics: boolean;
  /** Contacts access is present. */
  contacts: boolean;
  /** Anything host-specific: capabilities['maps'] === true. */
  [capability: string]: boolean;
}

const NONE: HostCapabilities = {
  camera: false,
  location: false,
  photoLibrary: false,
  notifications: false,
  biometrics: false,
  contacts: false,
};

let current: HostCapabilities = { ...NONE };
const listeners = new Set<(capabilities: HostCapabilities) => void>();

/**
 * Called ONCE by the host at bootstrap, declaring what its binary supports:
 *
 *   configureHostCapabilities({ location: true, camera: true });
 *
 * Anything omitted stays false, so a Mini-App asking for something the host
 * never declared degrades instead of crashing.
 */
export function configureHostCapabilities(capabilities: Partial<HostCapabilities>): void {
  const next: HostCapabilities = { ...current };
  // Skip undefined so an omitted key keeps its current value rather than
  // widening the index signature to `boolean | undefined`.
  for (const [name, enabled] of Object.entries(capabilities)) {
    if (enabled !== undefined) next[name] = enabled;
  }
  current = next;
  for (const listener of listeners) listener(current);
}

/** Non-React read, for use inside services and API helpers. */
export function getHostCapabilities(): HostCapabilities {
  return current;
}

/** Test helper — restores the "host declares nothing" baseline. */
export function resetHostCapabilities(): void {
  current = { ...NONE };
  for (const listener of listeners) listener(current);
}

export function subscribeToHostCapabilities(
  listener: (capabilities: HostCapabilities) => void,
): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
