/**
 * Sync store - tracks sync operation state.
 *
 * Responsibilities:
 * - Track sync operation state (for loading spinners)
 * - Manage sync operation counting (multiple concurrent syncs)
 * - Track sync errors
 *
 * Trade-off: We show a single "syncing" status even when multiple operations
 * are in flight. This keeps the UI simple - users don't need to know about
 * individual operations, just whether the app is busy.
 */
import { writable, derived } from 'svelte/store';

export type SyncStatus = 'idle' | 'syncing' | 'error';

export interface SyncState {
  /** Sync operation status - shows if we're fetching/pushing data */
  status: SyncStatus;
  /** Last sync error message (cleared on successful sync) */
  error: string | null;
}

const initialState: SyncState = {
  status: 'idle',
  error: null,
};

export const syncStore = writable<SyncState>({ ...initialState });

// Derived
export const isSyncing = derived(syncStore, ($sync) => $sync.status === 'syncing');

/**
 * Track pending sync operations.
 * We increment on start, decrement on end.
 * Status is "syncing" while count > 0.
 */
let pendingSyncOps = 0;

export function beginSyncOp(): void {
  pendingSyncOps++;

  syncStore.update((state) => ({ ...state, status: 'syncing' }));
}

export function endSyncOp(error?: string): void {
  pendingSyncOps = Math.max(0, pendingSyncOps - 1);

  if (pendingSyncOps === 0) {
    syncStore.update((state) => ({
      ...state,
      status: error ? 'error' : 'idle',
      error: error ?? null,
    }));
  } else if (error) {
    syncStore.update((state) => ({ ...state, error }));
  }
}

export function clearSyncError(): void {
  syncStore.update((state) => ({ ...state, error: null }));
}
