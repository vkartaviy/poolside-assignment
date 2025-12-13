/**
 * Tests for todo CRUD routes.
 *
 * Includes comprehensive conflict testing for:
 * - Version conflicts (optimistic locking)
 * - Concurrent update scenarios
 * - Sync token cursor behavior
 */

import { beforeEach, describe, expect, it } from 'vitest';
import Fastify from 'fastify';
import { todoRoutes } from './todos.js';
import { clearStore, createList, createTodo, getTodo } from '../store.js';
import { ALLOWED_NEXT_STATES, type TodoState } from '@poolside/core';

async function buildApp() {
  const app = Fastify();
  await app.register(todoRoutes);
  return app;
}

const ALL_STATES = Object.keys(ALLOWED_NEXT_STATES) as TodoState[];

// Find any invalid transition (for testing API rejects it)
function findInvalidTransition(): { from: TodoState; to: TodoState } {
  for (const from of ALL_STATES) {
    for (const to of ALL_STATES) {
      if (from !== to && !ALLOWED_NEXT_STATES[from].includes(to)) {
        return { from, to };
      }
    }
  }
  throw new Error('No invalid transition found in config');
}

// Find a valid transition chain starting from a given state
function findValidTransitionChain(startState: TodoState, length: number): TodoState[] {
  const chain: TodoState[] = [startState];
  let current = startState;

  for (let i = 0; i < length; i++) {
    const nextStates = ALLOWED_NEXT_STATES[current];
    if (nextStates.length === 0) break;
    current = nextStates[0];
    chain.push(current);
  }

  return chain;
}

describe('Todo Routes', () => {
  const testListId = 'test-list-123';
  const testUserId = 'test-user-123';

  beforeEach(async () => {
    await clearStore();
    await createList({
      id: testListId,
      joinKey: 'testkey1',
      createdAt: '2025-01-01T00:00:00.000Z',
    });
  });

  // ============================================================================
  // GET /lists/:listId/todos - Basic Operations
  // ============================================================================

  describe('GET /lists/:listId/todos', () => {
    it('returns empty array for list with no todos', async () => {
      const app = await buildApp();

      const response = await app.inject({
        method: 'GET',
        url: `/lists/${testListId}/todos?userId=${testUserId}`,
      });

      expect(response.statusCode).toBe(200);

      const body = response.json();
      expect(body.todos).toEqual([]);
      expect(body.syncToken).toBeDefined();
    });

    it('returns 404 for non-existent list', async () => {
      const app = await buildApp();

      const response = await app.inject({
        method: 'GET',
        url: '/lists/non-existent-list/todos?userId=test',
      });

      expect(response.statusCode).toBe(404);
      expect(response.json().code).toBe('NOT_FOUND');
    });

    it('returns todos sorted by updatedAt then id', async () => {
      const app = await buildApp();
      const t1 = '2025-01-01T00:00:00.000Z';
      const t2 = '2025-01-01T00:00:00.001Z';

      // Create todos with specific ordering
      await createTodo({
        id: 'b',
        listId: testListId,
        title: 'B',
        state: 'TODO',
        createdBy: testUserId,
        createdAt: t1,
        updatedAt: t1,
        version: 1,
      });

      await createTodo({
        id: 'a',
        listId: testListId,
        title: 'A',
        state: 'TODO',
        createdBy: testUserId,
        createdAt: t1,
        updatedAt: t1,
        version: 1,
      });

      await createTodo({
        id: 'c',
        listId: testListId,
        title: 'C',
        state: 'TODO',
        createdBy: testUserId,
        createdAt: t1,
        updatedAt: t2,
        version: 1,
      });

      const response = await app.inject({
        method: 'GET',
        url: `/lists/${testListId}/todos?userId=${testUserId}`,
      });

      const body = response.json();
      const ids = body.todos.map((t: { id: string }) => t.id);
      expect(ids).toEqual(['a', 'b', 'c']);
    });

    it('returns only newer todos when syncToken provided', async () => {
      const app = await buildApp();
      const t1 = '2025-01-01T00:00:00.000Z';
      const t2 = '2025-01-01T00:00:00.001Z';

      await createTodo({
        id: 'old-todo',
        listId: testListId,
        title: 'Old',
        state: 'TODO',
        createdBy: testUserId,
        createdAt: t1,
        updatedAt: t1,
        version: 1,
      });

      await createTodo({
        id: 'new-todo',
        listId: testListId,
        title: 'New',
        state: 'TODO',
        createdBy: testUserId,
        createdAt: t1,
        updatedAt: t2,
        version: 1,
      });

      // First sync to get token
      const firstResponse = await app.inject({
        method: 'GET',
        url: `/lists/${testListId}/todos?userId=${testUserId}`,
      });

      const { syncToken } = firstResponse.json();

      // Add another todo after getting the token
      const t3 = '2025-01-01T00:00:00.002Z';
      await createTodo({
        id: 'newest-todo',
        listId: testListId,
        title: 'Newest',
        state: 'TODO',
        createdBy: testUserId,
        createdAt: t3,
        updatedAt: t3,
        version: 1,
      });

      // Sync with token - should only get the newest
      const syncResponse = await app.inject({
        method: 'GET',
        url: `/lists/${testListId}/todos?userId=${testUserId}&syncToken=${syncToken}`,
      });

      const body = syncResponse.json();
      expect(body.todos).toHaveLength(1);
      expect(body.todos[0].id).toBe('newest-todo');
    });
  });

  // ============================================================================
  // POST /lists/:listId/todos - Create Operations
  // ============================================================================

  describe('POST /lists/:listId/todos', () => {
    it('creates a todo with correct structure', async () => {
      const app = await buildApp();

      const response = await app.inject({
        method: 'POST',
        url: `/lists/${testListId}/todos`,
        payload: {
          id: 'new-todo-123',
          title: 'Test Todo',
          userId: testUserId,
          createdAt: '2025-01-01T00:00:00.000Z',
        },
      });

      expect(response.statusCode).toBe(201);

      const body = response.json();
      expect(body.id).toBe('new-todo-123');
      expect(body.listId).toBe(testListId);
      expect(body.title).toBe('Test Todo');
      expect(body.state).toBe('TODO');
      expect(body.createdBy).toBe(testUserId);
      expect(body.version).toBe(1);
      expect(body.updatedAt).toBeDefined();
    });

    it('returns 404 for non-existent list', async () => {
      const app = await buildApp();

      const response = await app.inject({
        method: 'POST',
        url: '/lists/non-existent-list/todos',
        payload: {
          id: 'new-todo',
          title: 'Test',
          userId: testUserId,
          createdAt: '2025-01-01T00:00:00.000Z',
        },
      });

      expect(response.statusCode).toBe(404);
      expect(response.json().code).toBe('NOT_FOUND');
    });

    it('validates todo id format - rejects invalid characters', async () => {
      const app = await buildApp();

      const response = await app.inject({
        method: 'POST',
        url: `/lists/${testListId}/todos`,
        payload: {
          id: 'invalid id with spaces!',
          title: 'Test',
          userId: testUserId,
          createdAt: '2025-01-01T00:00:00.000Z',
        },
      });

      expect(response.statusCode).toBe(400);
      expect(response.json().code).toBe('VALIDATION_ERROR');
    });

    it('validates createdAt format - rejects invalid timestamp', async () => {
      const app = await buildApp();

      const response = await app.inject({
        method: 'POST',
        url: `/lists/${testListId}/todos`,
        payload: {
          id: 'valid-id',
          title: 'Test',
          userId: testUserId,
          createdAt: 'not-a-timestamp',
        },
      });

      expect(response.statusCode).toBe(400);
      expect(response.json().code).toBe('VALIDATION_ERROR');
    });

    it('returns 409 ALREADY_EXISTS for duplicate id', async () => {
      const app = await buildApp();

      // Create first todo
      await app.inject({
        method: 'POST',
        url: `/lists/${testListId}/todos`,
        payload: {
          id: 'duplicate-id',
          title: 'First',
          userId: testUserId,
          createdAt: '2025-01-01T00:00:00.000Z',
        },
      });

      // Try to create another with same id
      const response = await app.inject({
        method: 'POST',
        url: `/lists/${testListId}/todos`,
        payload: {
          id: 'duplicate-id',
          title: 'Second',
          userId: testUserId,
          createdAt: '2025-01-01T00:00:00.001Z',
        },
      });

      expect(response.statusCode).toBe(409);
      expect(response.json().code).toBe('ALREADY_EXISTS');
    });

    it('persists todo in store', async () => {
      const app = await buildApp();

      await app.inject({
        method: 'POST',
        url: `/lists/${testListId}/todos`,
        payload: {
          id: 'persisted-todo',
          title: 'Test',
          userId: testUserId,
          createdAt: '2025-01-01T00:00:00.000Z',
        },
      });

      const storedTodo = await getTodo('persisted-todo');
      expect(storedTodo).toBeDefined();
      expect(storedTodo?.title).toBe('Test');
    });
  });

  // ============================================================================
  // PATCH /todos/:todoId/state - Basic Update Operations
  // ============================================================================

  describe('PATCH /todos/:todoId/state', () => {
    it('updates todo state successfully', async () => {
      const app = await buildApp();

      // Create a todo first
      await createTodo({
        id: 'todo-to-update',
        listId: testListId,
        title: 'Test',
        state: 'TODO',
        createdBy: testUserId,
        createdAt: '2025-01-01T00:00:00.000Z',
        updatedAt: '2025-01-01T00:00:00.000Z',
        version: 1,
      });

      const response = await app.inject({
        method: 'PATCH',
        url: '/todos/todo-to-update/state',
        payload: {
          nextState: 'ONGOING',
          expectedVersion: 1,
        },
      });

      expect(response.statusCode).toBe(200);

      const body = response.json();
      expect(body.state).toBe('ONGOING');
      expect(body.version).toBe(2);
    });

    it('returns 404 for non-existent todo', async () => {
      const app = await buildApp();

      const response = await app.inject({
        method: 'PATCH',
        url: '/todos/non-existent/state',
        payload: {
          nextState: 'ONGOING',
          expectedVersion: 1,
        },
      });

      expect(response.statusCode).toBe(404);
      expect(response.json().code).toBe('NOT_FOUND');
    });

    it('returns 400 INVALID_TRANSITION for invalid state transitions', async () => {
      const app = await buildApp();
      const { from, to } = findInvalidTransition();

      await createTodo({
        id: 'todo-invalid-transition',
        listId: testListId,
        title: 'Test',
        state: from,
        createdBy: testUserId,
        createdAt: '2025-01-01T00:00:00.000Z',
        updatedAt: '2025-01-01T00:00:00.000Z',
        version: 1,
      });

      const response = await app.inject({
        method: 'PATCH',
        url: '/todos/todo-invalid-transition/state',
        payload: {
          nextState: to,
          expectedVersion: 1,
        },
      });

      expect(response.statusCode).toBe(400);
      expect(response.json().code).toBe('INVALID_TRANSITION');
    });

    it('allows valid state machine transitions', async () => {
      const app = await buildApp();
      const chain = findValidTransitionChain('TODO', 3);

      await createTodo({
        id: 'state-machine-test',
        listId: testListId,
        title: 'Test',
        state: chain[0],
        createdBy: testUserId,
        createdAt: '2025-01-01T00:00:00.000Z',
        updatedAt: '2025-01-01T00:00:00.000Z',
        version: 1,
      });

      // Walk through the transition chain derived from config
      for (let i = 1; i < chain.length; i++) {
        const response = await app.inject({
          method: 'PATCH',
          url: '/todos/state-machine-test/state',
          payload: { nextState: chain[i], expectedVersion: i },
        });
        expect(response.statusCode).toBe(200);
        expect(response.json().state).toBe(chain[i]);
      }
    });
  });

  // ============================================================================
  // Version Conflict Tests (Optimistic Locking)
  // ============================================================================

  describe('Version Conflicts', () => {
    it('returns 409 VERSION_CONFLICT when expectedVersion does not match', async () => {
      const app = await buildApp();

      await createTodo({
        id: 'conflict-todo',
        listId: testListId,
        title: 'Test',
        state: 'TODO',
        createdBy: testUserId,
        createdAt: '2025-01-01T00:00:00.000Z',
        updatedAt: '2025-01-01T00:00:00.000Z',
        version: 3, // Current version is 3
      });

      // Try to update with stale version (expecting version 1)
      const response = await app.inject({
        method: 'PATCH',
        url: '/todos/conflict-todo/state',
        payload: {
          nextState: 'ONGOING',
          expectedVersion: 1, // Stale version
        },
      });

      expect(response.statusCode).toBe(409);
      expect(response.json().code).toBe('VERSION_CONFLICT');
    });

    it('includes currentTodo in version conflict response', async () => {
      const app = await buildApp();

      await createTodo({
        id: 'conflict-with-details',
        listId: testListId,
        title: 'Current Title',
        state: 'ONGOING',
        createdBy: testUserId,
        createdAt: '2025-01-01T00:00:00.000Z',
        updatedAt: '2025-01-01T00:00:00.000Z',
        version: 5,
      });

      const response = await app.inject({
        method: 'PATCH',
        url: '/todos/conflict-with-details/state',
        payload: {
          nextState: 'DONE',
          expectedVersion: 2, // Stale
        },
      });

      expect(response.statusCode).toBe(409);

      const body = response.json();
      expect(body.details).toBeDefined();
      expect(body.details.currentTodo).toBeDefined();
      expect(body.details.currentTodo.version).toBe(5);
      expect(body.details.currentTodo.state).toBe('ONGOING');
      expect(body.details.currentTodo.title).toBe('Current Title');
    });

    it('version increments on each successful update', async () => {
      const app = await buildApp();

      await createTodo({
        id: 'version-increment-test',
        listId: testListId,
        title: 'Test',
        state: 'TODO',
        createdBy: testUserId,
        createdAt: '2025-01-01T00:00:00.000Z',
        updatedAt: '2025-01-01T00:00:00.000Z',
        version: 1,
      });

      // Update 1: version 1 -> 2
      let response = await app.inject({
        method: 'PATCH',
        url: '/todos/version-increment-test/state',
        payload: { nextState: 'ONGOING', expectedVersion: 1 },
      });
      expect(response.json().version).toBe(2);

      // Update 2: version 2 -> 3
      response = await app.inject({
        method: 'PATCH',
        url: '/todos/version-increment-test/state',
        payload: { nextState: 'TODO', expectedVersion: 2 },
      });
      expect(response.json().version).toBe(3);

      // Update 3: version 3 -> 4
      response = await app.inject({
        method: 'PATCH',
        url: '/todos/version-increment-test/state',
        payload: { nextState: 'ONGOING', expectedVersion: 3 },
      });
      expect(response.json().version).toBe(4);
    });

    it('concurrent updates - only one succeeds, other gets conflict', async () => {
      const app = await buildApp();

      await createTodo({
        id: 'concurrent-update-test',
        listId: testListId,
        title: 'Test',
        state: 'TODO',
        createdBy: testUserId,
        createdAt: '2025-01-01T00:00:00.000Z',
        updatedAt: '2025-01-01T00:00:00.000Z',
        version: 1,
      });

      // Simulate two clients reading the same version
      const clientAVersion = 1;
      const clientBVersion = 1;

      // Client A updates first (succeeds): TODO -> ONGOING
      const responseA = await app.inject({
        method: 'PATCH',
        url: '/todos/concurrent-update-test/state',
        payload: { nextState: 'ONGOING', expectedVersion: clientAVersion },
      });
      expect(responseA.statusCode).toBe(200);
      expect(responseA.json().version).toBe(2);

      // Simulate more updates to get back to original state (so client B's transition is valid)
      // ONGOING -> TODO
      await app.inject({
        method: 'PATCH',
        url: '/todos/concurrent-update-test/state',
        payload: { nextState: 'TODO', expectedVersion: 2 },
      });
      // Now state is back to TODO but version is 3

      // Client B tries to update with stale version (valid transition, but version conflict)
      const responseB = await app.inject({
        method: 'PATCH',
        url: '/todos/concurrent-update-test/state',
        payload: { nextState: 'ONGOING', expectedVersion: clientBVersion },
      });
      expect(responseB.statusCode).toBe(409);
      expect(responseB.json().code).toBe('VERSION_CONFLICT');

      // Client B can see current state in response
      expect(responseB.json().details.currentTodo.version).toBe(3);
    });

    it('client can retry after conflict with correct version', async () => {
      const app = await buildApp();

      await createTodo({
        id: 'retry-after-conflict',
        listId: testListId,
        title: 'Test',
        state: 'TODO',
        createdBy: testUserId,
        createdAt: '2025-01-01T00:00:00.000Z',
        updatedAt: '2025-01-01T00:00:00.000Z',
        version: 1,
      });

      // First client updates: TODO -> ONGOING
      await app.inject({
        method: 'PATCH',
        url: '/todos/retry-after-conflict/state',
        payload: { nextState: 'ONGOING', expectedVersion: 1 },
      });

      // Another update to get back to TODO (so second client's transition is valid)
      // ONGOING -> TODO
      await app.inject({
        method: 'PATCH',
        url: '/todos/retry-after-conflict/state',
        payload: { nextState: 'TODO', expectedVersion: 2 },
      });
      // Now state is TODO, version is 3

      // Second client tries with stale version (valid transition, version conflict)
      const conflictResponse = await app.inject({
        method: 'PATCH',
        url: '/todos/retry-after-conflict/state',
        payload: { nextState: 'ONGOING', expectedVersion: 1 },
      });
      expect(conflictResponse.statusCode).toBe(409);
      expect(conflictResponse.json().code).toBe('VERSION_CONFLICT');

      // Get the current version from conflict response
      const currentVersion = conflictResponse.json().details.currentTodo.version;
      expect(currentVersion).toBe(3);

      // Retry with correct version (TODO -> ONGOING is valid)
      const retryResponse = await app.inject({
        method: 'PATCH',
        url: '/todos/retry-after-conflict/state',
        payload: { nextState: 'ONGOING', expectedVersion: currentVersion },
      });
      expect(retryResponse.statusCode).toBe(200);
      expect(retryResponse.json().state).toBe('ONGOING');
    });
  });

  // ============================================================================
  // Sync Token and Cursor Tests
  // ============================================================================

  describe('Sync Token Behavior', () => {
    it('sync token cursor handles concurrent modifications', async () => {
      const app = await buildApp();

      // Create initial todo
      await createTodo({
        id: 'sync-cursor-test',
        listId: testListId,
        title: 'Test',
        state: 'TODO',
        createdBy: testUserId,
        createdAt: '2025-01-01T00:00:00.000Z',
        updatedAt: '2025-01-01T00:00:00.000Z',
        version: 1,
      });

      // Get initial sync
      const firstSync = await app.inject({
        method: 'GET',
        url: `/lists/${testListId}/todos?userId=${testUserId}`,
      });
      const { syncToken } = firstSync.json();

      // Update the todo (simulates concurrent modification)
      await app.inject({
        method: 'PATCH',
        url: '/todos/sync-cursor-test/state',
        payload: { nextState: 'ONGOING', expectedVersion: 1 },
      });

      // Sync with token - should get the updated todo
      const deltaSync = await app.inject({
        method: 'GET',
        url: `/lists/${testListId}/todos?userId=${testUserId}&syncToken=${syncToken}`,
      });

      const deltaTodos = deltaSync.json().todos;
      expect(deltaTodos.length).toBe(1);
      expect(deltaTodos[0].id).toBe('sync-cursor-test');
      expect(deltaTodos[0].state).toBe('ONGOING');
      expect(deltaTodos[0].version).toBe(2);
    });

    it('updatedAt changes on each update ensuring sync cursor advances', async () => {
      const app = await buildApp();

      await createTodo({
        id: 'timestamp-test',
        listId: testListId,
        title: 'Test',
        state: 'TODO',
        createdBy: testUserId,
        createdAt: '2025-01-01T00:00:00.000Z',
        updatedAt: '2025-01-01T00:00:00.000Z',
        version: 1,
      });

      const response1 = await app.inject({
        method: 'PATCH',
        url: '/todos/timestamp-test/state',
        payload: { nextState: 'ONGOING', expectedVersion: 1 },
      });
      const updatedAt1 = response1.json().updatedAt;

      const response2 = await app.inject({
        method: 'PATCH',
        url: '/todos/timestamp-test/state',
        payload: { nextState: 'TODO', expectedVersion: 2 },
      });
      const updatedAt2 = response2.json().updatedAt;

      // Monotonic timestamps should be strictly increasing
      expect(updatedAt2 > updatedAt1).toBe(true);
    });

    it('multiple rapid updates all have distinct timestamps', async () => {
      const app = await buildApp();

      await createTodo({
        id: 'rapid-update-test',
        listId: testListId,
        title: 'Test',
        state: 'TODO',
        createdBy: testUserId,
        createdAt: '2025-01-01T00:00:00.000Z',
        updatedAt: '2025-01-01T00:00:00.000Z',
        version: 1,
      });

      const timestamps: string[] = [];

      // Perform several rapid updates
      for (let i = 1; i <= 5; i++) {
        const nextState = i % 2 === 1 ? 'ONGOING' : 'TODO';
        const response = await app.inject({
          method: 'PATCH',
          url: '/todos/rapid-update-test/state',
          payload: { nextState, expectedVersion: i },
        });
        timestamps.push(response.json().updatedAt);
      }

      // All timestamps should be unique and increasing
      const uniqueTimestamps = new Set(timestamps);
      expect(uniqueTimestamps.size).toBe(5);

      for (let i = 1; i < timestamps.length; i++) {
        expect(timestamps[i] > timestamps[i - 1]).toBe(true);
      }
    });
  });

  // ============================================================================
  // Soft Delete Handling
  // ============================================================================

  describe('Soft Delete Handling', () => {
    it('returns 404 for soft-deleted todo', async () => {
      const app = await buildApp();

      await createTodo({
        id: 'soft-deleted-todo',
        listId: testListId,
        title: 'Test',
        state: 'TODO',
        createdBy: testUserId,
        createdAt: '2025-01-01T00:00:00.000Z',
        updatedAt: '2025-01-01T00:00:00.000Z',
        version: 1,
        deletedAt: '2025-01-02T00:00:00.000Z', // Soft deleted
      });

      const response = await app.inject({
        method: 'PATCH',
        url: '/todos/soft-deleted-todo/state',
        payload: { nextState: 'ONGOING', expectedVersion: 1 },
      });

      expect(response.statusCode).toBe(404);
      expect(response.json().code).toBe('NOT_FOUND');
    });
  });
});
