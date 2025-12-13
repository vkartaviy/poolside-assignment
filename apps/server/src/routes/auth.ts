/**
 * Authentication routes - bootstrap user identity.
 */

import type { FastifyInstance } from 'fastify';
import type { BootstrapRequest, BootstrapResponse } from '@poolside/core';
import { getUser, createUser } from '../store.js';

export async function authRoutes(app: FastifyInstance): Promise<void> {
  app.post<{
    Body: BootstrapRequest;
    Reply: BootstrapResponse;
  }>('/auth/bootstrap', async (request, reply) => {
    const { userId } = request.body;

    // Try to find existing user
    if (userId) {
      const existingUser = await getUser(userId);

      if (existingUser) {
        return reply.send({ user: existingUser });
      }
    }

    // Create new user
    const user = await createUser({
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    });

    return reply.status(201).send({ user });
  });
}
