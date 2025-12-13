/**
 * EventStreamClient - A reusable SSE client with status tracking.
 *
 * Provides a simple subscribe/unsubscribe API that handles:
 * - Connection management
 * - Status tracking (disconnected, connecting, connected)
 * - Automatic reconnection (delegated to EventSource)
 */

import type { HostPlatform, HostEventStreamEvent } from '@poolside/core';

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected';

export interface EventStreamSubscription {
  unsubscribe(): void;
}

export interface SubscribeOptions {
  url: string;
  headers?: Record<string, string>;
  onEvent: (event: HostEventStreamEvent) => void;
  onStatusChange?: (status: ConnectionStatus) => void;
}

export class EventStreamClient {
  constructor(private readonly platform: HostPlatform) {}

  /**
   * Subscribe to an SSE stream. Returns a subscription object with an unsubscribe() method.
   * EventSource handles automatic reconnection internally.
   */
  subscribe(options: SubscribeOptions): EventStreamSubscription {
    const { url, headers, onEvent, onStatusChange } = options;

    let closeStream: (() => Promise<void>) | null = null;
    let cancelled = false;

    const cancel = (): void => {
      if (cancelled) {
        return;
      }

      cancelled = true;

      if (closeStream) {
        void closeStream();

        closeStream = null;
      }

      onStatusChange?.('disconnected');
    };

    // Start connection
    onStatusChange?.('connecting');

    void this.platform
      .openEventStream(
        { url, ...(headers ? { headers } : {}) },
        {
          onOpen: () => {
            if (cancelled) {
              return;
            }

            onStatusChange?.('connected');
          },
          onEvent: (event) => {
            if (cancelled) {
              return;
            }

            // Handle "connected" event as connection confirmation
            if (event.name === 'connected') {
              onStatusChange?.('connected');
              return;
            }

            onEvent(event);
          },
          onError: () => {
            if (cancelled) {
              return;
            }

            // EventSource will auto-reconnect, just update status
            onStatusChange?.('connecting');
          },
        }
      )
      .then((close) => {
        if (cancelled) {
          void close();
          return;
        }

        closeStream = close;
      })
      .catch(() => {
        // NOTE: Intentional trade-off - error details are not propagated here.
        // The status change to 'disconnected' triggers reconnection logic, which is
        // the appropriate recovery action. Detailed error logging could be added
        // for observability in a production environment.
        if (cancelled) {
          return;
        }

        onStatusChange?.('disconnected');
      });

    return {
      unsubscribe: cancel,
    };
  }
}
