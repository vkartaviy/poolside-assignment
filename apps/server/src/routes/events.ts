/**
 * SSE endpoint for real-time list change notifications.
 */

import type { FastifyInstance } from 'fastify';
import { ErrorCodes } from '@poolside/core';
import { listExists } from '../store.js';
import { subscribe, unsubscribe } from '../sse.js';

export async function eventRoutes(app: FastifyInstance): Promise<void> {
  /**
   * SSE endpoint for list change notifications.
   * Clients connect here and receive "changed" events when the list is modified.
   */
  app.get<{
    Params: { listId: string };
  }>('/lists/:listId/events', async (request, reply) => {
    const { listId } = request.params;

    // Validate list exists
    const exists = await listExists(listId);

    if (!exists) {
      return reply.status(404).send({
        error: 'List not found',
        code: ErrorCodes.NOT_FOUND,
      });
    }

    // Set up SSE headers
    reply.raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'Access-Control-Allow-Origin': '*',
    });

    // Send initial connection confirmation
    reply.raw.write(`event: connected\ndata: {"listId":"${listId}"}\n\n`);

    // Register subscriber
    subscribe(listId, reply);

    // Handle client disconnect
    request.raw.on('close', () => {
      unsubscribe(listId, reply);
    });

    // Keep connection open (don't call reply.send())
  });
}
