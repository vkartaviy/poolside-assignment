import type {
  HostPlatform,
  HostFetchRequest,
  HostFetchResponse,
  HostEventStreamHandlers,
  HostEventStreamRequest,
} from '@poolside/core';

/**
 * Browser host platform implementation.
 *
 * Uses Fetch API for HTTP operations and localStorage for storage.
 */
export function createBrowserHostPlatform(): HostPlatform {
  return {
    // User-scoped storage

    async getItem<T>(key: string): Promise<T | null> {
      const raw = localStorage.getItem(key);

      if (raw == null) {
        return null;
      }

      // TODO: Add error handling for malformed JSON
      return JSON.parse(raw) as T;
    },

    async setItem<T>(key: string, value: T): Promise<void> {
      localStorage.setItem(key, JSON.stringify(value));
    },

    async removeItem(key: string): Promise<void> {
      localStorage.removeItem(key);
    },

    // Networking

    async fetch<T>(request: HostFetchRequest): Promise<HostFetchResponse<T>> {
      const res = await fetch(request.url, {
        method: request.method,
        ...(request.headers ? { headers: request.headers } : {}),
        ...(request.body != null ? { body: JSON.stringify(request.body) } : {}),
      });

      try {
        return { status: res.status, data: (await res.json()) as T };
      } catch {
        return { status: res.status };
      }
    },

    async openEventStream(
      request: HostEventStreamRequest,
      handlers: HostEventStreamHandlers
    ): Promise<() => Promise<void>> {
      const es = new EventSource(request.url);

      es.addEventListener('open', () => handlers.onOpen?.());

      es.addEventListener('connected', (e) => {
        handlers.onEvent({ name: 'connected', data: e.data ?? '' });
      });

      es.addEventListener('changed', (e) => {
        handlers.onEvent({ name: 'changed', data: e.data ?? '' });
      });

      es.addEventListener('error', () => {
        handlers.onError(new Error('EventSource error'));
      });

      return async () => es.close();
    },

    // UI support

    async showContextMenu(): Promise<string | null> {
      // TODO: Trade-off: Context menu isn't supported in browser - would need a custom implementation
      return null;
    },
  };
}
