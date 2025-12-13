/**
 * Connection store - tracks SSE connection status.
 *
 * Responsibilities:
 * - Track SSE connection state (for "connected" indicator in UI)
 */
import { writable, derived } from 'svelte/store';
import type { ConnectionStatus } from '@poolside/host';

export interface ConnectionState {
  /** SSE connection status - shows real-time connection health */
  status: ConnectionStatus;
}

const initialState: ConnectionState = {
  status: 'disconnected',
};

export const connectionStore = writable<ConnectionState>({ ...initialState });

// Derived
export const isConnected = derived(connectionStore, ($conn) => $conn.status === 'connected');

export function setConnectionStatus(status: ConnectionStatus): void {
  connectionStore.update((state) => ({ ...state, status }));
}
