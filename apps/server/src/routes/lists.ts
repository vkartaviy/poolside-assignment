/**
 * List management routes - create and join lists.
 */

import type { FastifyInstance } from 'fastify';
import {
  type ApiError,
  type CreateListRequest,
  type CreateListResponse,
  type JoinListRequest,
  type JoinListResponse,
  ErrorCodes,
} from '@poolside/core';
import { nanoid } from 'nanoid';
import { getUser, getListByJoinKey, createList } from '../store.js';

export async function listRoutes(app: FastifyInstance): Promise<void> {
  /**
   * Create a new todo list.
   */
  app.post<{
    Body: CreateListRequest;
    Reply: CreateListResponse | ApiError;
  }>('/lists', async (request, reply) => {
    const { userId } = request.body;

    // Validate user exists
    const user = await getUser(userId);

    if (!user) {
      return reply.status(401).send({
        error: 'User not found',
        code: ErrorCodes.UNAUTHORIZED,
      });
    }

    const listId = crypto.randomUUID();
    const joinKey = nanoid(8); // Short, shareable key
    const now = new Date().toISOString();

    // Create the list
    await createList({
      id: listId,
      joinKey,
      createdAt: now,
    });

    return reply.status(201).send({
      listId,
      joinKey,
    });
  });

  /**
   * Join an existing list via join key.
   */
  app.post<{
    Body: JoinListRequest;
    Reply: JoinListResponse | ApiError;
  }>('/lists/join', async (request, reply) => {
    const { userId, joinKey } = request.body;

    // Validate user exists
    const user = await getUser(userId);

    if (!user) {
      return reply.status(401).send({
        error: 'User not found',
        code: ErrorCodes.UNAUTHORIZED,
      });
    }

    // Find list by join key
    const list = await getListByJoinKey(joinKey);

    if (!list) {
      return reply.status(404).send({
        error: 'List not found',
        code: ErrorCodes.NOT_FOUND,
      });
    }

    return reply.send({
      listId: list.id,
      list,
    });
  });
}
