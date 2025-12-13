/**
 * Server-Sent Events (SSE) connection management.
 *
 * Handles real-time updates from the server. When the server broadcasts a "changed" event,
 * we trigger a sync to fetch the latest data.
 *
 * Trade-off: SSE is invalidation-only (no data payload). This keeps the protocol simple
 * and avoids data consistency issues between SSE and REST responses. The client always
 * fetches canonical state via the sync endpoint.
 */
import {
  EventStreamClient,
  type EventStreamSubscription,
  type ConnectionStatus,
} from '@poolside/host';
import { hostPlatform } from '$lib/host-platform.js';

const eventStreamClient = new EventStreamClient(hostPlatform);

let currentSubscription: EventStreamSubscription | null = null;

export interface EventStreamOptions {
  url: string;
  onChanged: () => void;
  onStatusChange: (status: ConnectionStatus) => void;
}

/** Connect to the event stream for a list. Cancels any existing connection. */
export function connectEventStream(options: EventStreamOptions): void {
  cancelEventStream();

  currentSubscription = eventStreamClient.subscribe({
    url: options.url,
    onEvent: (event) => {
      if (event.name === 'changed') {
        options.onChanged();
      }
    },
    onStatusChange: options.onStatusChange,
  });
}

/** Disconnect from the current event stream. */
export function cancelEventStream(): void {
  currentSubscription?.unsubscribe();
  currentSubscription = null;
}
