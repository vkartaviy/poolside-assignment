/**
 * App initialization action.
 *
 * Handles bootstrapping the user session, restoring saved list state,
 * and establishing the initial sync connection.
 */

import { getErrorMessage } from '@poolside/host';

import { api } from '$lib/api/client.js';
import { storage } from '$lib/api/storage.js';
import { authStore, setUser, setReady, setError, restoreList } from '$lib/stores/index.js';
import { clearSyncState } from '$lib/sync/index.js';
import { syncOnce, connectToListEventStream } from './sync.js';

// Re-import from the sync module to avoid circular dependency
import { handleAuthError, isUnauthenticatedError } from '$lib/sync/index.js';

/**
 * Bootstrap the user session.
 */
export async function bootstrap(): Promise<void> {
  clearSyncState();

  authStore.update((state) => ({
    ...state,
    status: 'loading',
    error: null,
  }));

  try {
    const savedUserId = await storage.getUserId();
    const response = await api.bootstrap(savedUserId ? { userId: savedUserId } : {});

    await storage.setUserId(response.user.id);
    setUser(response.user);

    const savedList = await restoreList();

    if (savedList) {
      connectToListEventStream(savedList.listId);
      await syncOnce();
    }

    setReady();
  } catch (err) {
    if (isUnauthenticatedError(err)) {
      handleAuthError();
      return;
    }

    setError(getErrorMessage(err));
  }
}
