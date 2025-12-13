export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export interface HostFetchRequest {
  method: HttpMethod;
  url: string;
  body?: unknown;
  headers?: Record<string, string>;
}

export interface HostFetchResponse<T> {
  status: number;
  data?: T;
}

export interface HostEventStreamRequest {
  url: string;
  headers?: Record<string, string>;
}

export interface HostEventStreamEvent {
  name: string;
  data: string;
}

export interface HostEventStreamHandlers {
  onOpen?: () => void;
  onEvent: (event: HostEventStreamEvent) => void;
  onError: (error: unknown) => void;
}

/**
 * Host I/O boundary that allows running the same sync engine in different
 * environments (Electron main, renderer, browser, worker, etc).
 *
 * This interface is intentionally transport-level, not domain-level.
 * The host decides which URLs/events matter.
 */
export interface HostPlatform {
  // User-scoped storage
  getItem<T>(key: string): Promise<T | null>;
  setItem<T>(key: string, value: T): Promise<void>;
  removeItem(key: string): Promise<void>;

  // Networking
  fetch<T>(request: HostFetchRequest): Promise<HostFetchResponse<T>>;
  openEventStream(
    request: HostEventStreamRequest,
    handlers: HostEventStreamHandlers
  ): Promise<() => Promise<void>>;

  // UI support
  showContextMenu(items: { label: string; id: string }[]): Promise<string | null>;
}
