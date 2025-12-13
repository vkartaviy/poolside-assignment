/**
 * Todo merge logic - single function to merge server todos with local state.
 *
 * ```
 * ┌─────────────────────────────────────────────────────────────────┐
 * │                         MERGE FLOW                              │
 * └─────────────────────────────────────────────────────────────────┘
 *
 * INPUTS:
 * ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
 * │ Server State │     │   Incoming   │     │   Pending    │
 * │   (cache)    │     │    Todos     │     │  Mutations   │
 * └──────────────┘     └──────────────┘     └──────────────┘
 *        │                    │                    │
 *        └────────────────────┼────────────────────┘
 *                             ▼
 * ┌─────────────────────────────────────────────────────────────────┐
 * │  1. UPDATE SERVER STATE                                         │
 * │     - Newer version wins                                        │
 * │     - Preserve original createdAt (stable ordering)             │
 * └─────────────────────────────────────────────────────────────────┘
 *                             │
 *                             ▼
 * ┌─────────────────────────────────────────────────────────────────┐
 * │  2. KEEP OPTIMISTIC TODOS                                       │
 * │     - version === 0 (not yet confirmed by server)               │
 * └─────────────────────────────────────────────────────────────────┘
 *                             │
 *                             ▼
 * ┌─────────────────────────────────────────────────────────────────┐
 * │  3. DERIVE DISPLAY STATE                                        │
 * │     - Server state + pending mutations applied in order         │
 * │     - Sort by (createdAt, id) for stable order                  │
 * └─────────────────────────────────────────────────────────────────┘
 *                             │
 *                             ▼
 * OUTPUT:
 *                     ┌───────────────┐
 *                     │ Display Todos │
 *                     └───────────────┘
 * ```
 */

import type { Todo } from '@poolside/core';
import {
  getServerTodo,
  setServerTodo,
  getAllServerTodos,
  getAllPendingMutations,
} from './state.js';

// ============================================================================
// Public API
// ============================================================================

/**
 * Check if a todo is optimistic (created locally, not yet confirmed).
 */
export function isOptimisticTodo(todo: Todo): boolean {
  return todo.version === 0;
}

/**
 * Merge incoming server todos with local state.
 *
 * This is the single merge function for all sync operations:
 * - Initial sync
 * - Incremental sync (SSE events)
 * - Mutation responses
 *
 * Steps:
 * 1. Update server state with incoming todos (newest wins)
 * 2. Keep optimistic todos not yet on server
 * 3. Derive display state with pending mutations applied
 *
 * @param local - Current local todos (may include optimistic)
 * @param incoming - Todos from server
 * @returns Merged todos for display
 */
export function mergeTodos(local: Todo[], incoming: Todo[]): Todo[] {
  // Collect createdAt from local optimistic todos to preserve order
  const optimisticCreatedAtById = new Map<string, string>();

  for (const todo of local) {
    if (isOptimisticTodo(todo)) {
      optimisticCreatedAtById.set(todo.id, todo.createdAt);
    }
  }

  // Step 1: Update server state with incoming todos
  for (const incomingTodo of incoming) {
    const existing = getServerTodo(incomingTodo.id);
    const preserveCreatedAt = existing?.createdAt ?? optimisticCreatedAtById.get(incomingTodo.id);

    updateServerStateEntry(incomingTodo, preserveCreatedAt);
  }

  // Step 2: Keep optimistic todos not yet confirmed by server
  const optimisticTodos = local.filter((todo) => isOptimisticTodo(todo) && !getServerTodo(todo.id));

  // Step 3: Derive display state and sort by createdAt
  return [...deriveDisplayTodos(), ...optimisticTodos].sort(compareByCreatedAt);
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * Compare todos by createdAt for sorting (oldest first).
 * Falls back to id comparison for stable ordering.
 */
function compareByCreatedAt(a: Todo, b: Todo): number {
  const aTime = Date.parse(a.createdAt);
  const bTime = Date.parse(b.createdAt);

  // Handle invalid dates by falling back to id comparison
  if (!Number.isFinite(aTime) || !Number.isFinite(bTime)) {
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  }

  // Sort by createdAt, then by id for stability
  if (aTime !== bTime) {
    return aTime - bTime;
  }

  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

/**
 * Check if incoming todo is newer than existing.
 */
function isNewerThan(incoming: Todo, existing: Todo | undefined): boolean {
  if (!existing) {
    return true;
  }

  if (incoming.version > existing.version) {
    return true;
  }

  if (incoming.version === existing.version) {
    return new Date(incoming.updatedAt) >= new Date(existing.updatedAt);
  }

  return false;
}

/**
 * Update server state with incoming todo if it's newer.
 */
function updateServerStateEntry(todo: Todo, preserveCreatedAt?: string): void {
  const existing = getServerTodo(todo.id);

  // Preserve original createdAt if we have it
  const todoToStore =
    preserveCreatedAt && todo.createdAt !== preserveCreatedAt
      ? { ...todo, createdAt: preserveCreatedAt }
      : todo;

  if (isNewerThan(todoToStore, existing)) {
    setServerTodo(todoToStore);
  }
}

/**
 * Derive display todos from server state + pending mutations.
 *
 * For each server todo, apply all pending mutations in order
 * to show optimistic state while sync is in progress.
 */
function deriveDisplayTodos(): Todo[] {
  return getAllServerTodos().map((todo) => {
    const mutations = getAllPendingMutations(todo.id);

    if (mutations.length === 0) {
      return todo;
    }

    // Apply all mutations in order to derive current optimistic state
    return mutations.reduce<Todo>((acc, mutation) => {
      switch (mutation.type) {
        case 'state-change':
          return { ...acc, state: mutation.nextState, updatedAt: mutation.appliedAt };
        // Future: case 'content-change': return { ...acc, ...mutation.changes };
      }
    }, todo);
  });
}
