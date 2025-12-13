/**
 * Dialog store - manages join dialog state.
 *
 * Responsibilities:
 * - Track dialog open/closed state
 * - Prevent closing while join is in progress
 * - Auto-close on successful join (via forceClose)
 */
import { writable, derived, get } from 'svelte/store';
import { listStore, setListActionError } from './list.svelte.js';

export interface DialogState {
  isJoinDialogOpen: boolean;
}

const initialState: DialogState = {
  isJoinDialogOpen: false,
};

export const dialogStore = writable<DialogState>({ ...initialState });

// Derived: check if join is in progress
export const isJoining = derived(listStore, ($list) => $list.actionStatus === 'joining');

/**
 * Open join dialog (only if list action is idle)
 */
export function openJoinDialog(): void {
  const list = get(listStore);

  if (list.actionStatus === 'idle') {
    // Reset any previous error
    setListActionError(null);

    dialogStore.update((state) => ({ ...state, isJoinDialogOpen: true }));
  }
}

/**
 * Close join dialog (only if not currently joining)
 */
export function closeJoinDialog(): void {
  const list = get(listStore);

  if (list.actionStatus !== 'joining') {
    dialogStore.update((state) => ({ ...state, isJoinDialogOpen: false }));
  }
}

/**
 * Force close dialog (used after successful join)
 */
export function forceCloseJoinDialog(): void {
  dialogStore.update((state) => ({ ...state, isJoinDialogOpen: false }));
}
