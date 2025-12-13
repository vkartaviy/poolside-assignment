/**
 * Sync module - optimistic updates and mutation processing.
 *
 * Architecture:
 * - state.ts: Single SyncState object (server cache, pending mutations, runs)
 * - merge.ts: Single merge function for combining server + local state
 * - processor.ts: Process pending mutations in phases
 * - operations.ts: Shared sync operations (syncOnce, handleAuthError)
 */

export * from './state.js';
export * from './merge.js';
export * from './processor.js';
export * from './operations.js';
