/**
 * View store - derives which main view to display.
 *
 * Centralizes the view selection logic that was previously in App.svelte.
 * This makes the conditional rendering declarative and testable.
 *
 * Priority order:
 * 1. session-expired: Auth session is invalid (401)
 * 2. not-found: List was not found on server
 * 3. todo-list: Active list exists
 * 4. creating: List creation in progress
 * 5. no-list: Default - no list selected
 */
import { derived } from 'svelte/store';
import { authStore } from './auth.svelte.js';
import { listStore } from './list.svelte.js';

export type ViewType = 'session-expired' | 'not-found' | 'todo-list' | 'creating' | 'no-list';

export const currentView = derived([authStore, listStore], ([$auth, $list]): ViewType => {
  if ($auth.status === 'session-expired') {
    return 'session-expired';
  }

  if ($list.error === 'not-found') {
    return 'not-found';
  }

  if ($list.listId) {
    return 'todo-list';
  }

  if ($list.actionStatus === 'creating') {
    return 'creating';
  }

  return 'no-list';
});
