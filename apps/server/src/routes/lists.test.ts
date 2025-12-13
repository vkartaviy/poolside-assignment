/**
 * Tests for list management routes.
 */

import { beforeEach, describe, expect, it } from 'vitest';
import Fastify from 'fastify';
import { listRoutes } from './lists.js';
import { clearStore, createUser, getListByJoinKey } from '../store.js';

async function buildApp() {
  const app = Fastify();
  await app.register(listRoutes);
  return app;
}

describe('List Routes', () => {
  const testUserId = 'test-user-123';

  beforeEach(async () => {
    await clearStore();
    await createUser({ id: testUserId, createdAt: '2025-01-01T00:00:00.000Z' });
  });

  describe('POST /lists', () => {
    it('creates a new list and returns listId and joinKey', async () => {
      const app = await buildApp();

      const response = await app.inject({
        method: 'POST',
        url: '/lists',
        payload: { userId: testUserId },
      });

      expect(response.statusCode).toBe(201);

      const body = response.json();
      expect(body.listId).toBeDefined();
      expect(body.joinKey).toBeDefined();
      expect(typeof body.listId).toBe('string');
      expect(typeof body.joinKey).toBe('string');
    });

    it('returns 401 when user does not exist', async () => {
      const app = await buildApp();

      const response = await app.inject({
        method: 'POST',
        url: '/lists',
        payload: { userId: 'non-existent-user' },
      });

      expect(response.statusCode).toBe(401);

      const body = response.json();
      expect(body.code).toBe('UNAUTHORIZED');
    });

    it('generates joinKey with correct length (8 chars)', async () => {
      const app = await buildApp();

      const response = await app.inject({
        method: 'POST',
        url: '/lists',
        payload: { userId: testUserId },
      });

      const body = response.json();
      expect(body.joinKey.length).toBe(8);
    });

    it('persists list in store', async () => {
      const app = await buildApp();

      const response = await app.inject({
        method: 'POST',
        url: '/lists',
        payload: { userId: testUserId },
      });

      const body = response.json();
      const storedList = await getListByJoinKey(body.joinKey);

      expect(storedList).toBeDefined();
      expect(storedList?.id).toBe(body.listId);
    });

    it('creates unique listIds for multiple lists', async () => {
      const app = await buildApp();

      const response1 = await app.inject({
        method: 'POST',
        url: '/lists',
        payload: { userId: testUserId },
      });

      const response2 = await app.inject({
        method: 'POST',
        url: '/lists',
        payload: { userId: testUserId },
      });

      const body1 = response1.json();
      const body2 = response2.json();

      expect(body1.listId).not.toBe(body2.listId);
      expect(body1.joinKey).not.toBe(body2.joinKey);
    });
  });

  describe('POST /lists/join', () => {
    it('joins an existing list successfully', async () => {
      const app = await buildApp();

      // Create a list first
      const createResponse = await app.inject({
        method: 'POST',
        url: '/lists',
        payload: { userId: testUserId },
      });

      const { joinKey, listId } = createResponse.json();

      // Join the list
      const joinResponse = await app.inject({
        method: 'POST',
        url: '/lists/join',
        payload: { userId: testUserId, joinKey },
      });

      expect(joinResponse.statusCode).toBe(200);

      const body = joinResponse.json();
      expect(body.listId).toBe(listId);
      expect(body.list).toBeDefined();
      expect(body.list.id).toBe(listId);
      expect(body.list.joinKey).toBe(joinKey);
    });

    it('returns 401 when user does not exist', async () => {
      const app = await buildApp();

      // Create a list first
      const createResponse = await app.inject({
        method: 'POST',
        url: '/lists',
        payload: { userId: testUserId },
      });

      const { joinKey } = createResponse.json();

      // Try to join with non-existent user
      const joinResponse = await app.inject({
        method: 'POST',
        url: '/lists/join',
        payload: { userId: 'non-existent-user', joinKey },
      });

      expect(joinResponse.statusCode).toBe(401);

      const body = joinResponse.json();
      expect(body.code).toBe('UNAUTHORIZED');
    });

    it('returns 404 when joinKey does not exist', async () => {
      const app = await buildApp();

      const response = await app.inject({
        method: 'POST',
        url: '/lists/join',
        payload: { userId: testUserId, joinKey: 'invalid1' },
      });

      expect(response.statusCode).toBe(404);

      const body = response.json();
      expect(body.code).toBe('NOT_FOUND');
    });

    it('returns list with createdAt timestamp', async () => {
      const app = await buildApp();

      // Create a list
      const createResponse = await app.inject({
        method: 'POST',
        url: '/lists',
        payload: { userId: testUserId },
      });

      const { joinKey } = createResponse.json();

      // Join the list
      const joinResponse = await app.inject({
        method: 'POST',
        url: '/lists/join',
        payload: { userId: testUserId, joinKey },
      });

      const body = joinResponse.json();
      expect(body.list.createdAt).toBeDefined();
      expect(typeof body.list.createdAt).toBe('string');
    });
  });
});
