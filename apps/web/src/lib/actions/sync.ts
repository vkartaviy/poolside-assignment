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

import type { ConnectionStatus } from '@poolside/host';
import { api } from '$lib/api/client.js';
import { connectEventStream } from '$lib/api/event-stream.js';
import { setConnectionStatus } from '$lib/stores/index.js';
import { syncOnce, restartAllMutationRuns } from '$lib/sync/index.js';

// ============================================================================
// Connection Status Handling
// ============================================================================

// Trade-off: This module uses global state, assuming a single active list at a time.
// For multi-list rendering (e.g., two lists side-by-side), I would refactor to a
// ListSyncManager class that tracks per-list state (connection, sync token, todos).

// Trade-off: We use SSE reconnection to trigger sync instead of window.online.
// In plugin architectures (VS Code, JetBrains), the webview's online status may not
// reflect the host's actual connectivity. SSE reconnection is authoritative proof
// that we can reach the server. The window.online event would only help if SSE
// isn't active, but in that case we'd reconnect SSE anyway which triggers this.
let previousConnectionStatus: ConnectionStatus = 'disconnected';

/**
 * Handle SSE connection status changes.
 * Triggers sync when reconnecting (status transitions to 'connected').
 */
function handleConnectionStatusChange(status: ConnectionStatus): void {
  // Sync when we reconnect (wasn't connected, now connected)
  if (status === 'connected' && previousConnectionStatus !== 'connected') {
    void syncOnce().finally(() => {
      restartAllMutationRuns();
    });
  }

  previousConnectionStatus = status;
  setConnectionStatus(status);
}

/**
 * Handle SSE "changed" event - server notified us that data changed.
 */
function handleChanged(): void {
  void syncOnce();
}

// ============================================================================
// Event Stream Connection
// ============================================================================

/**
 * Connect to the event stream for a list.
 * Starts SSE connection for real-time updates.
 */
export function connectToListEventStream(listId: string): void {
  connectEventStream({
    url: api.getListEventsUrl(listId),
    onChanged: handleChanged,
    onStatusChange: handleConnectionStatusChange,
  });
}

// ============================================================================
// Re-exports
// ============================================================================

// Re-export sync operations for convenience
export { syncOnce, clearListState } from '$lib/sync/index.js';

// Re-export event stream control
export { cancelEventStream } from '$lib/api/event-stream.js';
