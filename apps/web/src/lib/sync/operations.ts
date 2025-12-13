/**
 * Sync operations - shared functions for sync and mutation processing.
 *
 * This module breaks the circular dependency between:
 * - mutation-processor.ts (needs syncOnce)
 * - actions/sync.ts (starts mutation runs)
 *
 * Both can now import from here without circular imports.
 */

import { get } from 'svelte/store';
import { isUnauthorizedError, isNotFoundError, getErrorMessage } from '@poolside/host';
import { api } from '$lib/api/client.js';
import { cancelEventStream } from '$lib/api/event-stream.js';
import {
  authStore,
  listStore,
  todosStore,
  beginSyncOp,
  endSyncOp,
  clearSyncError,
  setSessionExpired,
  resetTodos,
  clearList,
} from '$lib/stores/index.js';
import { clearSyncState } from './state.js';
import { mergeTodos } from './merge.js';

// ============================================================================
// Internal State
// ============================================================================

let isSyncing = false;
let syncQueued = false;

// ============================================================================
// Public API
// ============================================================================

/**
 * Check if an error is a 401 Unauthorized error.
 */
export function isUnauthenticatedError(err: unknown): boolean {
  return isUnauthorizedError(err) && err.statusCode === 401;
}

/**
 * Handle authentication error - cancel streams and enter expired state.
 */
export function handleAuthError(): void {
  cancelEventStream();
  clearSyncState();
  setSessionExpired();
}

/**
 * Clear the current list state (used when list is not found).
 */
export async function clearListState(): Promise<void> {
  cancelEventStream();
  clearSyncState();
  resetTodos();
  await clearList();
}

/**
 * Perform a single sync operation.
 *
 * Features:
 * - Queues requests if already syncing (avoids duplicate calls)
 * - Updates server state via mergeTodos
 * - Handles all errors internally (never throws)
 */
export async function syncOnce(): Promise<void> {
  // Queue if already syncing
  if (isSyncing) {
    syncQueued = true;
    return;
  }

  const authState = get(authStore);
  const listState = get(listStore);
  const todosState = get(todosStore);

  if (!listState.listId || !authState.user) {
    return;
  }

  isSyncing = true;
  beginSyncOp();

  try {
    const response = await api.syncTodos({
      listId: listState.listId,
      userId: authState.user.id,
      ...(todosState.syncToken ? { syncToken: todosState.syncToken } : {}),
    });

    todosStore.update((state) => ({
      ...state,
      todos: mergeTodos(state.todos, response.todos),
      syncToken: response.syncToken,
    }));

    clearSyncError();
    endSyncOp();
  } catch (err) {
    if (isUnauthenticatedError(err)) {
      endSyncOp();
      handleAuthError();
      return;
    }

    if (isNotFoundError(err)) {
      endSyncOp();
      void clearListState();
      return;
    }

    // All other errors (network, etc.) - show error state
    endSyncOp(getErrorMessage(err));
  } finally {
    isSyncing = false;

    // Process queued sync request
    if (syncQueued) {
      syncQueued = false;
      void syncOnce();
    }
  }
}
