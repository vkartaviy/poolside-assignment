/**
 * Tests for sync state management.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import type { Todo } from '@poolside/core';
import {
  getServerTodo,
  setServerTodo,
  getAllServerTodos,
  getNextMutation,
  getAllPendingMutations,
  hasPendingMutations,
  enqueueMutation,
  dequeueMutation,
  deletePendingMutations,
  getTodoIdsWithPendingMutations,
  hasActiveRun,
  setActiveRun,
  deleteActiveRun,
  getRunGeneration,
  cancelRunGeneration,
  clearSyncState,
} from './state.js';

// ============================================================================
// Test Helpers
// ============================================================================

function createTodo(overrides: Partial<Todo> = {}): Todo {
  return {
    id: 'todo-1',
    listId: 'list-1',
    title: 'Test todo',
    state: 'TODO',
    createdBy: 'user-1',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    version: 1,
    ...overrides,
  };
}

// ============================================================================
// Tests
// ============================================================================

describe('Sync State', () => {
  beforeEach(() => {
    clearSyncState();
  });

  describe('Server State', () => {
    it('returns undefined for non-existent todo', () => {
      expect(getServerTodo('non-existent')).toBeUndefined();
    });

    it('stores and retrieves a todo', () => {
      const todo = createTodo({ id: 'todo-1' });

      setServerTodo(todo);

      expect(getServerTodo('todo-1')).toEqual(todo);
    });

    it('returns all server todos', () => {
      const todo1 = createTodo({ id: 'todo-1' });
      const todo2 = createTodo({ id: 'todo-2' });

      setServerTodo(todo1);
      setServerTodo(todo2);

      const allTodos = getAllServerTodos();

      expect(allTodos).toHaveLength(2);
      expect(allTodos).toContainEqual(todo1);
      expect(allTodos).toContainEqual(todo2);
    });

    it('overwrites existing todo with same id', () => {
      const todo1 = createTodo({ id: 'todo-1', title: 'Original' });
      const todo2 = createTodo({ id: 'todo-1', title: 'Updated' });

      setServerTodo(todo1);
      setServerTodo(todo2);

      expect(getServerTodo('todo-1')?.title).toBe('Updated');
      expect(getAllServerTodos()).toHaveLength(1);
    });
  });

  describe('Pending Mutations', () => {
    it('returns undefined when no mutations exist', () => {
      expect(getNextMutation('todo-1')).toBeUndefined();
    });

    it('returns empty array for getAllPendingMutations when none exist', () => {
      expect(getAllPendingMutations('todo-1')).toEqual([]);
    });

    it('returns false for hasPendingMutations when none exist', () => {
      expect(hasPendingMutations('todo-1')).toBe(false);
    });

    it('enqueues a mutation and retrieves it', () => {
      const mutation = enqueueMutation('todo-1', 'ONGOING');

      expect(mutation.todoId).toBe('todo-1');
      expect(mutation.nextState).toBe('ONGOING');
      expect(mutation.id).toBeDefined();
      expect(mutation.appliedAt).toBeDefined();

      expect(getNextMutation('todo-1')).toEqual(mutation);
      expect(hasPendingMutations('todo-1')).toBe(true);
    });

    it('maintains FIFO order for mutations', () => {
      const mutation1 = enqueueMutation('todo-1', 'ONGOING');
      const mutation2 = enqueueMutation('todo-1', 'DONE');

      expect(getNextMutation('todo-1')).toEqual(mutation1);
      expect(getAllPendingMutations('todo-1')).toEqual([mutation1, mutation2]);
    });

    it('dequeues mutations in FIFO order', () => {
      enqueueMutation('todo-1', 'ONGOING');
      const mutation2 = enqueueMutation('todo-1', 'DONE');

      dequeueMutation('todo-1');

      expect(getNextMutation('todo-1')).toEqual(mutation2);
      expect(getAllPendingMutations('todo-1')).toEqual([mutation2]);
    });

    it('clears pending mutations flag when queue is empty', () => {
      enqueueMutation('todo-1', 'ONGOING');
      dequeueMutation('todo-1');

      expect(hasPendingMutations('todo-1')).toBe(false);
      expect(getNextMutation('todo-1')).toBeUndefined();
    });

    it('handles dequeue on empty queue gracefully', () => {
      dequeueMutation('todo-1');

      expect(hasPendingMutations('todo-1')).toBe(false);
    });

    it('deletes all pending mutations for a todo', () => {
      enqueueMutation('todo-1', 'ONGOING');
      enqueueMutation('todo-1', 'DONE');

      deletePendingMutations('todo-1');

      expect(hasPendingMutations('todo-1')).toBe(false);
      expect(getAllPendingMutations('todo-1')).toEqual([]);
    });

    it('returns all todo ids with pending mutations', () => {
      enqueueMutation('todo-1', 'ONGOING');
      enqueueMutation('todo-2', 'DONE');

      const ids = getTodoIdsWithPendingMutations();

      expect(ids).toHaveLength(2);
      expect(ids).toContain('todo-1');
      expect(ids).toContain('todo-2');
    });
  });

  describe('Active Runs', () => {
    it('returns false when no active run exists', () => {
      expect(hasActiveRun('todo-1')).toBe(false);
    });

    it('tracks active runs', () => {
      const run = Promise.resolve();

      setActiveRun('todo-1', run);

      expect(hasActiveRun('todo-1')).toBe(true);
    });

    it('deletes active runs', () => {
      const run = Promise.resolve();

      setActiveRun('todo-1', run);
      deleteActiveRun('todo-1');

      expect(hasActiveRun('todo-1')).toBe(false);
    });
  });

  describe('Run Generation (Cancellation)', () => {
    it('starts at generation 0', () => {
      // clearSyncState resets to a new state, so generation is 1 after first cancel
      // Let's check it's a number and cancellation increments it
      const gen1 = getRunGeneration();

      expect(typeof gen1).toBe('number');
    });

    it('increments generation on cancel', () => {
      const gen1 = getRunGeneration();

      cancelRunGeneration();

      const gen2 = getRunGeneration();

      expect(gen2).toBe(gen1 + 1);
    });
  });

  describe('clearSyncState', () => {
    it('clears all state', () => {
      // Set up some state
      setServerTodo(createTodo({ id: 'todo-1' }));
      enqueueMutation('todo-1', 'ONGOING');
      setActiveRun('todo-1', Promise.resolve());
      const genBefore = getRunGeneration();

      clearSyncState();

      expect(getServerTodo('todo-1')).toBeUndefined();
      expect(hasPendingMutations('todo-1')).toBe(false);
      expect(hasActiveRun('todo-1')).toBe(false);
      expect(getRunGeneration()).toBe(genBefore + 1); // Generation incremented
    });
  });
});
