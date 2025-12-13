/**
 * Tests for todo merge logic.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import type { Todo } from '@poolside/core';
import { mergeTodos, isOptimisticTodo } from './merge.js';
import { clearSyncState, setServerTodo, getServerTodo, enqueueMutation } from './state.js';

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

describe('Merge Logic', () => {
  beforeEach(() => {
    clearSyncState();
  });

  describe('isOptimisticTodo', () => {
    it('returns true for version 0', () => {
      const todo = createTodo({ version: 0 });

      expect(isOptimisticTodo(todo)).toBe(true);
    });

    it('returns false for version > 0', () => {
      const todo = createTodo({ version: 1 });

      expect(isOptimisticTodo(todo)).toBe(false);
    });
  });

  describe('mergeTodos', () => {
    describe('cache updates', () => {
      it('updates cache with incoming todos', () => {
        const incoming = [createTodo({ id: 'todo-1', version: 1 })];

        mergeTodos([], incoming);

        expect(getServerTodo('todo-1')).toEqual(incoming[0]);
      });

      it('newer version wins', () => {
        const existing = createTodo({ id: 'todo-1', version: 1, title: 'Old' });
        const incoming = createTodo({ id: 'todo-1', version: 2, title: 'New' });

        setServerTodo(existing);
        mergeTodos([existing], [incoming]);

        expect(getServerTodo('todo-1')?.title).toBe('New');
        expect(getServerTodo('todo-1')?.version).toBe(2);
      });

      it('older version does not overwrite', () => {
        const existing = createTodo({ id: 'todo-1', version: 2, title: 'New' });
        const incoming = createTodo({ id: 'todo-1', version: 1, title: 'Old' });

        setServerTodo(existing);
        mergeTodos([existing], [incoming]);

        expect(getServerTodo('todo-1')?.title).toBe('New');
        expect(getServerTodo('todo-1')?.version).toBe(2);
      });

      it('same version uses updatedAt as tiebreaker', () => {
        const existing = createTodo({
          id: 'todo-1',
          version: 1,
          title: 'Earlier',
          updatedAt: '2024-01-01T00:00:00Z',
        });
        const incoming = createTodo({
          id: 'todo-1',
          version: 1,
          title: 'Later',
          updatedAt: '2024-01-01T01:00:00Z',
        });

        setServerTodo(existing);
        mergeTodos([existing], [incoming]);

        expect(getServerTodo('todo-1')?.title).toBe('Later');
      });
    });

    describe('optimistic todos', () => {
      it('preserves optimistic todos not on server', () => {
        const optimistic = createTodo({ id: 'optimistic-1', version: 0 });
        const serverTodo = createTodo({ id: 'server-1', version: 1 });

        const result = mergeTodos([optimistic], [serverTodo]);

        expect(result).toContainEqual(optimistic);
        expect(result).toContainEqual(serverTodo);
      });

      it('removes optimistic todo when server confirms it', () => {
        const optimistic = createTodo({ id: 'todo-1', version: 0 });
        const confirmed = createTodo({ id: 'todo-1', version: 1 });

        const result = mergeTodos([optimistic], [confirmed]);

        // Should only have the server version, not the optimistic one
        const todo1s = result.filter((t) => t.id === 'todo-1');

        expect(todo1s).toHaveLength(1);
        expect(todo1s[0]!.version).toBe(1);
      });

      it('preserves optimistic createdAt for ordering', () => {
        const optimistic = createTodo({
          id: 'todo-1',
          version: 0,
          createdAt: '2024-01-01T00:00:00Z',
        });
        const confirmed = createTodo({
          id: 'todo-1',
          version: 1,
          createdAt: '2024-01-01T00:00:01Z', // Server has different createdAt
        });

        mergeTodos([optimistic], [confirmed]);

        // Server cache should preserve original createdAt
        const serverTodo = getServerTodo('todo-1');
        expect(serverTodo).toBeDefined();
        expect(serverTodo!.createdAt).toBe('2024-01-01T00:00:00Z');
      });
    });

    describe('pending mutations', () => {
      it('applies pending mutations to display state', () => {
        const serverTodo = createTodo({ id: 'todo-1', state: 'TODO', version: 1 });

        setServerTodo(serverTodo);
        enqueueMutation('todo-1', 'ONGOING');

        const result = mergeTodos([serverTodo], []);

        const displayTodo = result.find((t) => t.id === 'todo-1');
        expect(displayTodo).toBeDefined();
        expect(displayTodo!.state).toBe('ONGOING');
      });

      it('applies last mutation when multiple pending', () => {
        const serverTodo = createTodo({ id: 'todo-1', state: 'TODO', version: 1 });

        setServerTodo(serverTodo);
        enqueueMutation('todo-1', 'ONGOING');
        enqueueMutation('todo-1', 'DONE');

        const result = mergeTodos([serverTodo], []);

        const displayTodo = result.find((t) => t.id === 'todo-1');
        expect(displayTodo).toBeDefined();
        expect(displayTodo!.state).toBe('DONE');
      });

      it('shows server state when no pending mutations', () => {
        const serverTodo = createTodo({ id: 'todo-1', state: 'ONGOING', version: 1 });

        setServerTodo(serverTodo);

        const result = mergeTodos([serverTodo], []);

        const displayTodo = result.find((t) => t.id === 'todo-1');
        expect(displayTodo).toBeDefined();
        expect(displayTodo!.state).toBe('ONGOING');
      });
    });

    describe('sorting', () => {
      it('sorts todos by createdAt (oldest first)', () => {
        const todo1 = createTodo({ id: 'todo-1', createdAt: '2024-01-03T00:00:00Z', version: 1 });
        const todo2 = createTodo({ id: 'todo-2', createdAt: '2024-01-01T00:00:00Z', version: 1 });
        const todo3 = createTodo({ id: 'todo-3', createdAt: '2024-01-02T00:00:00Z', version: 1 });

        const result = mergeTodos([], [todo1, todo2, todo3]);

        expect(result[0]!.id).toBe('todo-2'); // Jan 1
        expect(result[1]!.id).toBe('todo-3'); // Jan 2
        expect(result[2]!.id).toBe('todo-1'); // Jan 3
      });

      it('uses id as tiebreaker when createdAt is the same', () => {
        const todoA = createTodo({ id: 'todo-a', createdAt: '2024-01-01T00:00:00Z', version: 1 });
        const todoB = createTodo({ id: 'todo-b', createdAt: '2024-01-01T00:00:00Z', version: 1 });

        const result = mergeTodos([], [todoB, todoA]);

        expect(result[0]!.id).toBe('todo-a');
        expect(result[1]!.id).toBe('todo-b');
      });

      it('sorts optimistic todos with server todos', () => {
        const optimistic = createTodo({
          id: 'opt-1',
          createdAt: '2024-01-02T00:00:00Z',
          version: 0,
        });
        const serverTodo = createTodo({
          id: 'server-1',
          createdAt: '2024-01-01T00:00:00Z',
          version: 1,
        });

        const result = mergeTodos([optimistic], [serverTodo]);

        expect(result[0]!.id).toBe('server-1'); // Jan 1
        expect(result[1]!.id).toBe('opt-1'); // Jan 2
      });
    });

    describe('full merge scenarios', () => {
      it('handles initial sync with empty local state', () => {
        const incoming = [
          createTodo({ id: 'todo-1', version: 1 }),
          createTodo({ id: 'todo-2', version: 1 }),
        ];

        const result = mergeTodos([], incoming);

        expect(result).toHaveLength(2);
      });

      it('handles incremental sync with existing local state', () => {
        const localTodo = createTodo({ id: 'todo-1', version: 1 });
        const incoming = [createTodo({ id: 'todo-1', version: 2, state: 'ONGOING' })];

        setServerTodo(localTodo);

        const result = mergeTodos([localTodo], incoming);

        expect(result).toHaveLength(1);
        expect(result[0]!.state).toBe('ONGOING');
      });

      it('handles mixed optimistic and server todos', () => {
        const optimistic1 = createTodo({ id: 'opt-1', version: 0 });
        const optimistic2 = createTodo({ id: 'opt-2', version: 0 });
        const serverTodo = createTodo({ id: 'server-1', version: 1 });

        setServerTodo(serverTodo);

        const local = [optimistic1, optimistic2, serverTodo];
        const incoming = [createTodo({ id: 'server-1', version: 2, state: 'ONGOING' })];

        const result = mergeTodos(local, incoming);

        expect(result).toHaveLength(3);

        const server1 = result.find((t) => t.id === 'server-1');
        expect(server1).toBeDefined();
        expect(server1!.state).toBe('ONGOING');
        expect(result.find((t) => t.id === 'opt-1')).toBeDefined();
        expect(result.find((t) => t.id === 'opt-2')).toBeDefined();
      });
    });
  });
});
