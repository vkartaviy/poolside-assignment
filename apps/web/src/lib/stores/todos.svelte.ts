/**
 * Todos store - manages todo items with optimistic updates.
 *
 * Responsibilities:
 * - Store the current list of todos (derived from server + pending mutations)
 * - Handle todo creation (optimistic)
 * - Handle todo state transitions (optimistic with conflict resolution)
 * - Sync todos from server
 *
 * ## Optimistic Update Strategy
 *
 * We maintain two layers (see `lib/sync/` for implementation):
 * 1. Server cache - canonical state from server
 * 2. Pending mutations - local intent not yet confirmed
 *
 * The displayed todos are derived: server state + pending mutations applied on top.
 * This allows instant UI feedback while handling conflicts gracefully.
 */
import { writable, derived } from 'svelte/store';
import type { Todo } from '@poolside/core';

// ============================================================================
// Types
// ============================================================================

export interface TodosState {
  todos: Todo[];
  /**
   * Sync token for delta sync.
   * The server returns this; we send it back to get only changes since last sync.
   */
  syncToken: string | null;
}

// ============================================================================
// Store
// ============================================================================

const initialState: TodosState = {
  todos: [],
  syncToken: null,
};

export const todosStore = writable<TodosState>({ ...initialState });

// Derived: active todos (excluding deleted)
export const activeTodos = derived(todosStore, ($todos) =>
  $todos.todos.filter((todo) => !todo.deletedAt)
);

// ============================================================================
// Actions
// ============================================================================

export function updateTodos(todos: Todo[]): void {
  todosStore.update((state) => ({ ...state, todos }));
}

export function resetTodos(): void {
  todosStore.set({
    todos: [],
    syncToken: null,
  });
}
