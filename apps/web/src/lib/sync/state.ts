/**
 * Sync state - single source of truth for optimistic updates.
 *
 * All sync-related state lives here in one object:
 * - serverState: Server-confirmed todos (source of truth)
 * - pendingMutations: Queued state changes per todo
 * - activeRuns: One processing promise per todo
 * - runGeneration: Cancellation token (increment to stop all runs)
 */

import type { Todo, TodoState } from '@poolside/core';

// ============================================================================
// Types
// ============================================================================

/** Base fields shared by all mutation types */
interface MutationBase {
  id: string;
  todoId: string;
  appliedAt: string; // ISO 8601
}

/** State transition mutation (TODO → ONGOING → DONE) */
export interface StateChangeMutation extends MutationBase {
  type: 'state-change';
  nextState: TodoState;
}

// Future: content updates (title, description, etc.)
// export interface ContentChangeMutation extends MutationBase {
//   type: "content-change";
//   changes: {
//     title?: string;
//     description?: string;
//   };
// }

/** Union of all mutation types - extensible for future mutation types */
export type PendingMutation = StateChangeMutation;
// Future: export type PendingMutation = StateChangeMutation | ContentChangeMutation;

interface SyncState {
  /** Server-confirmed todos - our source of truth */
  serverState: Map<string, Todo>;

  /** Pending mutations per todo - FIFO queues waiting to sync */
  pendingMutations: Map<string, PendingMutation[]>;

  /** Active runs - one Promise per todo being processed */
  activeRuns: Map<string, Promise<void>>;

  /** Cancellation token - increment to stop all runs */
  runGeneration: number;
}

// ============================================================================
// State (module-level singleton)
// ============================================================================

const state: SyncState = {
  serverState: new Map(),
  pendingMutations: new Map(),
  activeRuns: new Map(),
  runGeneration: 0,
};

// ============================================================================
// Server State Accessors
// ============================================================================

export function getServerTodo(todoId: string): Todo | undefined {
  return state.serverState.get(todoId);
}

export function setServerTodo(todo: Todo): void {
  state.serverState.set(todo.id, todo);
}

export function getAllServerTodos(): Todo[] {
  return [...state.serverState.values()];
}

// ============================================================================
// Pending Mutations Accessors
// ============================================================================

export function getNextMutation(todoId: string): PendingMutation | undefined {
  const queue = state.pendingMutations.get(todoId);

  return queue?.at(0);
}

export function getAllPendingMutations(todoId: string): PendingMutation[] {
  return state.pendingMutations.get(todoId) ?? [];
}

export function hasPendingMutations(todoId: string): boolean {
  const queue = state.pendingMutations.get(todoId);

  return queue != null && queue.length > 0;
}

export function enqueueMutation(todoId: string, nextState: TodoState): StateChangeMutation {
  const mutation: StateChangeMutation = {
    type: 'state-change',
    id: crypto.randomUUID(),
    todoId,
    nextState,
    appliedAt: new Date().toISOString(),
  };

  const queue = state.pendingMutations.get(todoId);

  if (queue) {
    queue.push(mutation);
  } else {
    state.pendingMutations.set(todoId, [mutation]);
  }

  return mutation;
}

export function dequeueMutation(todoId: string): void {
  const queue = state.pendingMutations.get(todoId);

  if (!queue || queue.length === 0) {
    state.pendingMutations.delete(todoId);
    return;
  }

  queue.shift();

  if (queue.length === 0) {
    state.pendingMutations.delete(todoId);
  }
}

export function deletePendingMutations(todoId: string): void {
  state.pendingMutations.delete(todoId);
}

export function getTodoIdsWithPendingMutations(): string[] {
  return [...state.pendingMutations.keys()];
}

// ============================================================================
// Active Runs Accessors
// ============================================================================

export function hasActiveRun(todoId: string): boolean {
  return state.activeRuns.has(todoId);
}

export function setActiveRun(todoId: string, run: Promise<void>): void {
  state.activeRuns.set(todoId, run);
}

export function deleteActiveRun(todoId: string): void {
  state.activeRuns.delete(todoId);
}

// ============================================================================
// Run Generation (Cancellation)
// ============================================================================

export function getRunGeneration(): number {
  return state.runGeneration;
}

export function cancelRunGeneration(): void {
  state.runGeneration += 1;
}

// ============================================================================
// Bulk Operations
// ============================================================================

/**
 * Clear all sync state - called on logout or list change.
 */
export function clearSyncState(): void {
  cancelRunGeneration();
  state.serverState.clear();
  state.pendingMutations.clear();
  state.activeRuns.clear();
}
