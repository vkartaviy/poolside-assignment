/**
 * List operations.
 *
 * Handles creating new lists and joining existing lists via join key.
 */

import { get } from 'svelte/store';
import { isNotFoundError, getErrorMessage } from '@poolside/host';

import { api } from '$lib/api/client.js';
import {
  authStore,
  listStore,
  setList,
  setListActionStatus,
  setListActionError,
  persistList,
  resetTodos,
  forceCloseJoinDialog,
} from '$lib/stores/index.js';
import { clearSyncState, handleAuthError, isUnauthenticatedError } from '$lib/sync/index.js';
import { syncOnce, connectToListEventStream } from './sync.js';

/**
 * Create a new todo list.
 */
export async function createList(): Promise<void> {
  const { user } = get(authStore);
  const { actionStatus } = get(listStore);

  if (!user || actionStatus !== 'idle') {
    return;
  }

  const userId = user.id;

  setListActionStatus('creating');

  try {
    const response = await api.createList({ userId });
    clearSyncState();
    resetTodos();

    setList(response.listId, response.joinKey);
    await persistList(response.listId, response.joinKey);

    connectToListEventStream(response.listId);
  } catch (err) {
    if (isUnauthenticatedError(err)) {
      handleAuthError();
      return;
    }

    setListActionError(getErrorMessage(err));
  } finally {
    setListActionStatus('idle');
  }
}

/**
 * Join an existing list via join key.
 */
export async function joinList(joinKey: string): Promise<void> {
  const { user } = get(authStore);
  const { actionStatus } = get(listStore);

  if (!user || actionStatus !== 'idle') {
    return;
  }

  const userId = user.id;

  setListActionStatus('joining');

  try {
    const response = await api.joinList({ userId, joinKey });
    clearSyncState();
    resetTodos();

    setList(response.listId, joinKey);
    await persistList(response.listId, joinKey);

    connectToListEventStream(response.listId);
    await syncOnce();

    // Close join dialog on success
    forceCloseJoinDialog();
  } catch (err) {
    if (isUnauthenticatedError(err)) {
      handleAuthError();
      return;
    }

    if (isNotFoundError(err)) {
      setListActionError('Invalid join key. The list may not exist.');
    } else {
      setListActionError(getErrorMessage(err));
    }
  } finally {
    setListActionStatus('idle');
  }
}
