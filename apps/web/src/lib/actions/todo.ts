/**
 * Todo operations.
 *
 * Handles creating new todos and updating todo state with optimistic updates.
 */

import { get } from 'svelte/store';
import { getErrorMessage } from '@poolside/host';
import type { Todo, TodoState } from '@poolside/core';

import { api } from '$lib/api/client.js';
import { authStore, listStore, todosStore, beginSyncOp, endSyncOp } from '$lib/stores/index.js';
import {
  mergeTodos,
  enqueueMutation,
  deletePendingMutations,
  startMutationRun,
  handleAuthError,
  isUnauthenticatedError,
} from '$lib/sync/index.js';

/**
 * Create a new todo (optimistic).
 */
export async function createTodo(title: string): Promise<void> {
  const { listId } = get(listStore);
  const { user } = get(authStore);

  if (!listId || !user) {
    return;
  }

  const userId = user.id;

  const now = new Date().toISOString();
  const todoId = crypto.randomUUID();

  const optimisticTodo: Todo = {
    id: todoId,
    listId,
    title,
    state: 'TODO',
    createdBy: userId,
    createdAt: now,
    updatedAt: now,
    version: 0,
  };

  todosStore.update((state) => ({
    ...state,
    todos: [...state.todos, optimisticTodo],
  }));

  beginSyncOp();

  try {
    const todo = await api.createTodo(listId, { id: todoId, title, userId, createdAt: now });

    todosStore.update((state) => ({
      ...state,
      todos: mergeTodos(state.todos, [todo]),
    }));

    endSyncOp();
  } catch (err) {
    if (isUnauthenticatedError(err)) {
      endSyncOp();
      handleAuthError();
      return;
    }

    deletePendingMutations(todoId);
    todosStore.update((state) => ({
      ...state,
      todos: state.todos.filter((t) => t.id !== todoId),
    }));

    endSyncOp(getErrorMessage(err));
  }
}

/**
 * Update a todo's state (optimistic).
 */
export function updateTodoState(todoId: string, nextState: TodoState): void {
  const { todos } = get(todosStore);
  const todo = todos.find((t) => t.id === todoId);

  if (!todo) {
    return;
  }

  const mutation = enqueueMutation(todoId, nextState);

  todosStore.update((state) => ({
    ...state,
    todos: state.todos.map((t) =>
      t.id === todoId ? { ...t, state: nextState, updatedAt: mutation.appliedAt } : t
    ),
  }));

  startMutationRun(todoId);
}
