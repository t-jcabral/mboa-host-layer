import type { MiniAppDefinition } from '@mboa/core';

export interface MiniAppLifecycleHooks {
  onRegistered?(definition: MiniAppDefinition): void;
  onEnter?(definition: MiniAppDefinition): void;
  onLeave?(definition: MiniAppDefinition): void;
}

/**
 * Lifecycle Manager.
 *
 * Cross-cutting concerns -- analytics, feature-flag refresh, session keepalive --
 * subscribe here instead of every Mini-App re-implementing them.
 */
class MiniAppLifecycleManager {
  private readonly subscribers = new Set<MiniAppLifecycleHooks>();

  subscribe(hooks: MiniAppLifecycleHooks): () => void {
    this.subscribers.add(hooks);
    return () => {
      this.subscribers.delete(hooks);
    };
  }

  private emit(event: keyof MiniAppLifecycleHooks, definition: MiniAppDefinition): void {
    for (const subscriber of this.subscribers) {
      try {
        subscriber[event]?.(definition);
      } catch {
        // A misbehaving listener must never take down Mini-App registration.
      }
    }
  }

  registered(definition: MiniAppDefinition): void {
    this.emit('onRegistered', definition);
  }

  entered(definition: MiniAppDefinition): void {
    this.emit('onEnter', definition);
  }

  left(definition: MiniAppDefinition): void {
    this.emit('onLeave', definition);
  }
}

export const miniAppLifecycle = new MiniAppLifecycleManager();
