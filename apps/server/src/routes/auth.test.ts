/**
 * Tests for authentication routes.
 */

import { beforeEach, describe, expect, it } from 'vitest';
import Fastify from 'fastify';
import { authRoutes } from './auth.js';
import { clearStore, createUser, getUser } from '../store.js';

async function buildApp() {
  const app = Fastify();
  await app.register(authRoutes);
  return app;
}

describe('Auth Routes', () => {
  beforeEach(async () => {
    await clearStore();
  });

  describe('POST /auth/bootstrap', () => {
    it('creates a new user when no userId provided', async () => {
      const app = await buildApp();

      const response = await app.inject({
        method: 'POST',
        url: '/auth/bootstrap',
        payload: {},
      });

      expect(response.statusCode).toBe(201);

      const body = response.json();
      expect(body.user).toBeDefined();
      expect(body.user.id).toBeDefined();
      expect(body.user.createdAt).toBeDefined();
    });

    it('returns existing user when valid userId provided', async () => {
      const app = await buildApp();

      // Create a user first
      const existingUser = await createUser({
        id: 'existing-user-123',
        createdAt: '2025-01-01T00:00:00.000Z',
      });

      const response = await app.inject({
        method: 'POST',
        url: '/auth/bootstrap',
        payload: { userId: existingUser.id },
      });

      expect(response.statusCode).toBe(200);

      const body = response.json();
      expect(body.user.id).toBe(existingUser.id);
      expect(body.user.createdAt).toBe(existingUser.createdAt);
    });

    it('creates new user when non-existent userId provided', async () => {
      const app = await buildApp();

      const response = await app.inject({
        method: 'POST',
        url: '/auth/bootstrap',
        payload: { userId: 'non-existent-user' },
      });

      expect(response.statusCode).toBe(201);

      const body = response.json();
      expect(body.user).toBeDefined();
      expect(body.user.id).not.toBe('non-existent-user'); // Gets a new UUID
    });

    it('returns user with correct structure', async () => {
      const app = await buildApp();

      const response = await app.inject({
        method: 'POST',
        url: '/auth/bootstrap',
        payload: {},
      });

      const body = response.json();

      // Verify user structure
      expect(typeof body.user.id).toBe('string');
      expect(body.user.id.length).toBeGreaterThan(0);
      expect(typeof body.user.createdAt).toBe('string');
      // Verify ISO 8601 format
      expect(new Date(body.user.createdAt).toISOString()).toBe(body.user.createdAt);
    });

    it('persists created user in store', async () => {
      const app = await buildApp();

      const response = await app.inject({
        method: 'POST',
        url: '/auth/bootstrap',
        payload: {},
      });

      const body = response.json();
      const storedUser = await getUser(body.user.id);

      expect(storedUser).toBeDefined();
      expect(storedUser?.id).toBe(body.user.id);
    });
  });
});
