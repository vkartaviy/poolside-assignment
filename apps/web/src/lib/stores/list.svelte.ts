/**
 * List store - manages the current todo list context.
 *
 * Responsibilities:
 * - Track which list the user is viewing (listId, joinKey)
 * - Handle list creation and joining
 * - Persist list selection to storage
 *
 * The joinKey is a shareable code that allows others to join the same list.
 * It's stored locally so we can display it in the UI for sharing.
 */
import { writable, derived } from 'svelte/store';
import { storage } from '$lib/api/storage.js';

export type ListActionStatus = 'idle' | 'creating' | 'joining';
export type ListError = 'not-found' | null;

export interface ListState {
  listId: string | null;
  joinKey: string | null;
  actionStatus: ListActionStatus;
  actionError: string | null;
  error: ListError;
}

const initialState: ListState = {
  listId: null,
  joinKey: null,
  actionStatus: 'idle',
  actionError: null,
  error: null,
};

export const listStore = writable<ListState>({ ...initialState });

// Derived
export const currentListId = derived(listStore, ($list) => $list.listId);
export const hasActiveList = derived(listStore, ($list) => $list.listId !== null);
export const isListBusy = derived(listStore, ($list) => $list.actionStatus !== 'idle');

/** Restore list from storage (called during bootstrap) */
export async function restoreList(): Promise<{ listId: string; joinKey: string } | null> {
  const savedListId = await storage.getListId();
  const savedJoinKey = await storage.getJoinKey();

  if (savedListId && savedJoinKey) {
    listStore.update((state) => ({
      ...state,
      listId: savedListId,
      joinKey: savedJoinKey,
      error: null,
    }));
    return { listId: savedListId, joinKey: savedJoinKey };
  }

  return null;
}

/** Set list after creation or joining */
export function setList(listId: string, joinKey: string): void {
  listStore.update((state) => ({
    ...state,
    listId,
    joinKey,
    error: null,
  }));
}

/** Set list action status (clears actionError when starting an action) */
export function setListActionStatus(status: ListActionStatus): void {
  listStore.update((state) => ({
    ...state,
    actionStatus: status,
    actionError: status !== 'idle' ? null : state.actionError,
  }));
}

/** Set list action error */
export function setListActionError(error: string | null): void {
  listStore.update((state) => ({ ...state, actionError: error }));
}

/** Persist list to storage */
export async function persistList(listId: string, joinKey: string): Promise<void> {
  await storage.setList(listId, joinKey);
}

/** Clear current list (e.g., list was deleted on server) */
export async function clearList(): Promise<void> {
  await storage.clearList();

  listStore.update((state) => ({
    ...state,
    listId: null,
    joinKey: null,
    error: 'not-found',
  }));
}
