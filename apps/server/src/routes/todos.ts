/**
 * Todo CRUD routes with sync support.
 *
 * Delta sync uses a composite cursor `(updatedAt, todoId)` with server-side
 * monotonic timestamps to ensure every write advances the cursor.
 *
 * Trade-off: The in-memory monotonic counter is a single-server simplification.
 * For distributed deployments, we would need to either extend the cursor to
 * `(updatedAt, serverId, todoId)` with per-server monotonic counters, or
 * adopt Hybrid Logical Clocks (HLC) for causally-ordered timestamps.
 */

import type { FastifyInstance } from 'fastify';
import {
  type ApiError,
  type CreateTodoRequest,
  type UpdateTodoStateRequest,
  type SyncTodosResponse,
  type Todo,
  ErrorCodes,
  decodeSyncToken,
  encodeSyncToken,
  isValidTransition,
  isValidIdentifier,
  isValidISOString,
} from '@poolside/core';
import { listExists, getTodosForList, createTodo, getTodo, compareAndSwapTodo } from '../store.js';
import { notifyListChanged } from '../sse.js';
import { getMonotonicISOString } from '../utils/time.js';

export async function todoRoutes(app: FastifyInstance): Promise<void> {
  /**
   * Get todos for a list with delta sync support.
   */
  app.get<{
    Params: { listId: string };
    // NOTE: userId is included for future authorization checks (e.g., list membership validation)
    // but not currently used. Kept for API consistency and forward compatibility.
    Querystring: { syncToken?: string; userId: string };
    Reply: SyncTodosResponse | ApiError;
  }>('/lists/:listId/todos', async (request, reply) => {
    const { listId } = request.params;
    const { syncToken } = request.query;

    // Validate list exists
    const exists = await listExists(listId);

    if (!exists) {
      return reply.status(404).send({
        error: 'List not found',
        code: ErrorCodes.NOT_FOUND,
      });
    }

    // Decode sync token to get the last seen cursor (updatedAt + id).
    let cursor: { updatedAt?: string; todoId?: string } | undefined;

    if (syncToken) {
      const payload = decodeSyncToken(syncToken);

      if (payload) {
        cursor =
          payload.lastId == null
            ? { updatedAt: payload.lastUpdatedAt }
            : { updatedAt: payload.lastUpdatedAt, todoId: payload.lastId };
      }
    }

    // Get todos (filtered by cursor if sync token provided)
    // Current:     WHERE (updatedAt, id) > ($1, $2)
    // Distributed: WHERE (updatedAt, serverId, id) > ($1, $2, $3)
    const todoList = await getTodosForList(listId, cursor);

    const lastTodo = todoList.at(-1);
    const latestUpdatedAt = lastTodo?.updatedAt ?? cursor?.updatedAt ?? new Date(0).toISOString();
    const latestTodoId = lastTodo?.id ?? cursor?.todoId;

    const newSyncToken = encodeSyncToken(
      latestTodoId == null
        ? { lastUpdatedAt: latestUpdatedAt }
        : { lastUpdatedAt: latestUpdatedAt, lastId: latestTodoId }
    );

    return reply.send({
      todos: todoList,
      syncToken: newSyncToken,
    });
  });

  /**
   * Create a new todo.
   */
  app.post<{
    Params: { listId: string };
    Body: CreateTodoRequest;
    Reply: Todo | ApiError;
  }>('/lists/:listId/todos', async (request, reply) => {
    const { listId } = request.params;
    const { id, title, userId, createdAt } = request.body;

    if (!isValidIdentifier(id)) {
      return reply.status(400).send({
        error: 'Invalid todo id',
        code: ErrorCodes.VALIDATION_ERROR,
      });
    }

    if (!isValidISOString(createdAt)) {
      return reply.status(400).send({
        error: 'Invalid createdAt timestamp',
        code: ErrorCodes.VALIDATION_ERROR,
      });
    }

    // Validate list exists
    const exists = await listExists(listId);

    if (!exists) {
      return reply.status(404).send({
        error: 'List not found',
        code: ErrorCodes.NOT_FOUND,
      });
    }

    const existingTodo = await getTodo(id);

    if (existingTodo) {
      return reply.status(409).send({
        error: 'Todo already exists',
        code: ErrorCodes.ALREADY_EXISTS,
      });
    }

    const updatedAt = getMonotonicISOString();
    const todo = await createTodo({
      id,
      listId,
      title,
      state: 'TODO',
      createdBy: userId,
      createdAt,
      updatedAt,
      version: 1,
    });

    notifyListChanged(listId);

    return reply.status(201).send(todo);
  });

  /**
   * Update a todo's state.
   */
  app.patch<{
    Params: { todoId: string };
    Body: UpdateTodoStateRequest;
    Reply: Todo | ApiError;
  }>('/todos/:todoId/state', async (request, reply) => {
    const { todoId } = request.params;
    const { nextState, expectedVersion } = request.body;

    // Find todo
    const todo = await getTodo(todoId);

    if (!todo || todo.deletedAt) {
      return reply.status(404).send({
        error: 'Todo not found',
        code: ErrorCodes.NOT_FOUND,
      });
    }

    // Validate state transition
    if (!isValidTransition(todo.state, nextState)) {
      return reply.status(400).send({
        error: `Invalid transition from ${todo.state} to ${nextState}`,
        code: ErrorCodes.INVALID_TRANSITION,
      });
    }

    /**
     * Atomic compare-and-swap update (optimistic locking)
     *
     * This prevents lost updates when multiple clients modify the same todo.
     * The client sends the version they last read; server rejects if changed.
     *
     * Database implementation pattern:
     *   UPDATE todos SET state = $1, version = version + 1
     *   WHERE id = $2 AND version = $3  -- atomic check-and-update
     *   RETURNING *;
     *
     * If affected_rows = 0, another client updated first -> return 409.
     * Client receives currentTodo in response and can retry with new version.
     */
    const result = await compareAndSwapTodo(todoId, expectedVersion, {
      state: nextState,
      updatedAt: getMonotonicISOString(),
    });

    if (!result.success) {
      // Handle both failure cases from discriminated union
      if (result.reason === 'not-found') {
        // Race condition: todo was deleted between getTodo and CAS
        return reply.status(404).send({
          error: 'Todo not found',
          code: ErrorCodes.NOT_FOUND,
        });
      }

      // Version conflict - return current state for client retry
      return reply.status(409).send({
        error: 'Version conflict',
        code: ErrorCodes.VERSION_CONFLICT,
        details: { currentTodo: result.currentTodo },
      });
    }

    notifyListChanged(result.todo.listId);

    return reply.send(result.todo);
  });
}
