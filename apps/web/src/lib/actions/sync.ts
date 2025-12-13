/**
 * Sync actions - high-level sync operations for the app.
 *
 * This module provides the public API for sync operations:
 * - connectToListEventStream: Start SSE connection for real-time updates
 * - syncOnce: Manual sync trigger
 * - clearListState: Clean up when leaving a list
 *
 * Core sync logic lives in lib/sync/operations.ts to avoid circular dependencies.
 */

import { api } from '$lib/api/client.js';
import { connectEventStream } from '$lib/api/event-stream.js';
import { setConnectionStatus } from '$lib/stores/index.js';
import { syncOnce, restartAllMutationRuns } from '$lib/sync/index.js';

// ============================================================================
// Online Listener
// ============================================================================

let onlineListenerAttached = false;

/**
 * Handle coming back online - sync and restart mutation runs.
 */
function handleOnline(): void {
  void syncOnce().finally(() => {
    restartAllMutationRuns();
  });
}

/**
 * Attach online listener for automatic sync on reconnect.
 */
function attachOnlineListener(): void {
  if (typeof window === 'undefined' || onlineListenerAttached) {
    return;
  }

  window.addEventListener('online', handleOnline);
  onlineListenerAttached = true;
}

// ============================================================================
// Event Stream Connection
// ============================================================================

/**
 * Connect to the event stream for a list.
 * Starts SSE connection for real-time updates.
 */
export function connectToListEventStream(listId: string): void {
  attachOnlineListener();

  connectEventStream({
    url: api.getListEventsUrl(listId),
    onChanged: () => {
      void syncOnce();
    },
    onStatusChange: setConnectionStatus,
  });
}

// ============================================================================
// Re-exports
// ============================================================================

// Re-export sync operations for convenience
export { syncOnce, clearListState } from '$lib/sync/index.js';

// Re-export event stream control
export { cancelEventStream } from '$lib/api/event-stream.js';
