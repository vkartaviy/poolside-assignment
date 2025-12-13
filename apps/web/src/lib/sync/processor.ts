/**
 * Mutation processor - processes pending todo state mutations.
 *
 * ```
 * ┌─────────────────────────────────────────────────────────────────┐
 * │                       MUTATION PROCESSOR                        │
 * │                    (one async loop per todo)                    │
 * └─────────────────────────────────────────────────────────────────┘
 *
 *                           ┌─────────┐
 *                           │  START  │
 *                           └────┬────┘
 *                                ▼
 * ┌─────────────────────────────────────────────────────────────────┐
 * │  1. CHECK - Can we process?                                     │
 * │     - Auth valid? List exists? Run not cancelled?               │
 * └─────────────────────────────────────────────────────────────────┘
 *                │ no                          │ yes
 *                ▼                             ▼
 *           ┌────────┐          ┌─────────────────────────────────┐
 *           │  EXIT  │          │  2. VALIDATE - Mutation valid?  │
 *           └────────┘          └─────────────────────────────────┘
 *                                     │                │
 *                                done/conflict      proceed
 *                                     │                │
 *                                     ▼                ▼
 *                               ┌──────────┐  ┌─────────────────┐
 *                               │ DEQUEUE  │  │   3. EXECUTE    │
 *                               │ + LOOP   │  │    API call     │
 *                               └──────────┘  └────────┬────────┘
 *                                                      ▼
 *                               ┌─────────────────────────────────┐
 *                               │  4. HANDLE - Process result     │
 *                               │  on success → dequeue + loop    │
 *                               │  on conflict → update + retry   │
 *                               │  on error → backoff + retry     │
 *                               └─────────────────────────────────┘
 * ```
 */

import { get } from 'svelte/store';
import { InvalidTransitionError, getErrorMessage } from '@poolside/host';
import { DEFAULT_BACKOFF, DEFAULT_RETRIES } from '@poolside/core/utils';
import { isValidTransition, type Todo } from '@poolside/core';
import { api } from '$lib/api/client.js';
import { authStore, listStore, todosStore, beginSyncOp, endSyncOp } from '$lib/stores/index.js';
import {
  type PendingMutation,
  getServerTodo,
  getNextMutation,
  dequeueMutation,
  hasActiveRun,
  setActiveRun,
  deleteActiveRun,
  getRunGeneration,
  getTodoIdsWithPendingMutations,
} from './state.js';
import { mergeTodos } from './merge.js';
import { syncOnce, handleAuthError, isUnauthenticatedError } from './operations.js';

// ============================================================================
// Types
// ============================================================================

/** Validation result - determines if we should proceed, skip, or abort */
type ValidationResult =
  | { status: 'proceed' }
  | { status: 'done' } // Server already has desired state, or todo gone
  | { status: 'conflict'; message: string }; // Transition now invalid

/** Execution result - what happened when we called the API */
type ExecutionResult =
  | { status: 'success'; todo: Todo }
  | { status: 'version-conflict'; todo: Todo }
  | { status: 'invalid-transition' }
  | { status: 'auth-error' }
  | { status: 'network-error'; message: string }
  | { status: 'cancelled' };

// ============================================================================
// Configuration
// ============================================================================

const backoff = DEFAULT_BACKOFF;

// ============================================================================
// Public API
// ============================================================================

/**
 * Start a mutation processing run for a todo if one isn't already running.
 */
export function startMutationRun(todoId: string): void {
  if (hasActiveRun(todoId)) {
    return;
  }

  const runGeneration = getRunGeneration();
  const run = processMutations(todoId, runGeneration).finally(() => {
    if (getRunGeneration() === runGeneration) {
      deleteActiveRun(todoId);
    }
  });

  setActiveRun(todoId, run);
}

/**
 * Restart mutation runs for all todos with pending mutations.
 * Called when coming back online or after reconnecting.
 */
export function restartAllMutationRuns(): void {
  for (const todoId of getTodoIdsWithPendingMutations()) {
    startMutationRun(todoId);
  }
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * Update display todos by merging with server todos.
 *
 * When called with server todos, updates server state then re-derives the display state.
 * When called with an empty array (default), just re-derives the display state from the
 * current server state - useful after validation skips a mutation (done/conflict).
 */
function updateDisplayTodos(serverTodos: Todo[] = []): void {
  todosStore.update((state) => ({
    ...state,
    todos: mergeTodos(state.todos, serverTodos),
  }));
}

// ============================================================================
// Phase 1: CHECK - Can we process?
// ============================================================================

/**
 * Check if we can process mutations right now.
 * Returns false if user logged out or list changed.
 */
function canProcess(): boolean {
  const auth = get(authStore);
  const list = get(listStore);

  return auth.user != null && list.listId != null && list.error == null;
}

/**
 * Check if this run is still valid (not cancelled).
 */
function isRunValid(runGeneration: number): boolean {
  return getRunGeneration() === runGeneration;
}

// ============================================================================
// Phase 2: VALIDATE - Is mutation still valid?
// ============================================================================

/**
 * Validate mutation against current server state.
 *
 * Outcomes:
 * - "proceed": Server state allows this transition
 * - "done": Server already has desired state, or todo is gone
 * - "conflict": Transition is now invalid (show error)
 */
async function validateMutation(mutation: PendingMutation): Promise<ValidationResult> {
  const serverTodo = getServerTodo(mutation.todoId);

  // No server state - todo doesn't exist or was deleted
  if (!serverTodo) {
    return { status: 'done' };
  }

  // Skip mutations for deleted todos
  if (serverTodo.deletedAt) {
    return { status: 'done' };
  }

  // Handle different mutation types
  switch (mutation.type) {
    case 'state-change': {
      // Server already has desired state? We're done
      if (serverTodo.state === mutation.nextState) {
        return { status: 'done' };
      }

      // Transition now invalid? Conflict
      if (!isValidTransition(serverTodo.state, mutation.nextState)) {
        return { status: 'conflict', message: 'Conflict, change not applied' };
      }

      return { status: 'proceed' };
    }

    // Future: case "content-change": return { status: "proceed" };
  }
}

// ============================================================================
// Phase 3: EXECUTE - Make the API call
// ============================================================================

/**
 * Execute the mutation API call.
 *
 * Wraps the API call and classifies all possible outcomes.
 */
async function executeMutation(
  mutation: PendingMutation,
  runGeneration: number
): Promise<ExecutionResult> {
  const auth = get(authStore);
  const serverTodo = getServerTodo(mutation.todoId);

  if (!auth.user || !serverTodo) {
    return { status: 'cancelled' };
  }

  beginSyncOp();

  try {
    // Handle different mutation types
    // Future: switch (mutation.type) { case "content-change": ... }

    const response = await api.updateTodoState(mutation.todoId, {
      userId: auth.user.id,
      nextState: mutation.nextState,
      expectedVersion: serverTodo.version,
    });

    // Check if cancelled while awaiting
    if (!isRunValid(runGeneration)) {
      return { status: 'cancelled' };
    }

    // Discriminated union - TypeScript narrows types automatically
    if (response.ok) {
      return { status: 'success', todo: response.todo };
    }

    if (response.conflict) {
      return { status: 'version-conflict', todo: response.currentTodo };
    }

    // Non-conflict error (shouldn't reach here as API client throws for other errors)
    return { status: 'network-error', message: 'Unknown response' };
  } catch (err) {
    if (isUnauthenticatedError(err)) {
      return { status: 'auth-error' };
    }

    if (err instanceof InvalidTransitionError) {
      return { status: 'invalid-transition' };
    }

    return { status: 'network-error', message: getErrorMessage(err) };
  } finally {
    endSyncOp();
  }
}

// ============================================================================
// Main Processing Loop
// ============================================================================

/**
 * Process pending mutations for a single todo.
 *
 * Each iteration: check → validate → execute → handle
 */
async function processMutations(todoId: string, runGeneration: number): Promise<void> {
  let attempt = 1;

  while (isRunValid(runGeneration)) {
    // Phase 1: Check preconditions
    if (!canProcess()) {
      return;
    }

    // Get next mutation
    const mutation = getNextMutation(todoId);

    if (!mutation) {
      // Queue empty
      return;
    }

    // Phase 2: Validate against server state
    const validation = await validateMutation(mutation);

    if (validation.status !== 'proceed') {
      dequeueMutation(todoId);
      updateDisplayTodos();
      // NOTE: Intentional trade-off - validation conflicts are handled silently.
      // A toast or transient error notification could improve UX but was deferred
      // to keep the MVP scope focused. The UI still reflects the correct state.
      continue;
    }

    // Phase 3: Execute API call
    const result = await executeMutation(mutation, runGeneration);

    // Phase 4: Handle result

    // Network errors use backoff with limited retries
    if (result.status === 'network-error') {
      if (attempt >= DEFAULT_RETRIES) {
        // Give up after max retries, mutation stays in queue for next online
        return;
      }
      await backoff(attempt);
      attempt += 1;
      continue;
    }

    attempt = 1;

    switch (result.status) {
      case 'success':
        dequeueMutation(mutation.todoId);
        updateDisplayTodos([result.todo]);
        continue;

      case 'version-conflict':
        updateDisplayTodos([result.todo]);
        continue;

      case 'invalid-transition':
        await syncOnce();
        continue;

      case 'auth-error':
        handleAuthError();
        return;

      case 'cancelled':
        return;
    }
  }
}
