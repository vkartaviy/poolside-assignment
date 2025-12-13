/**
 * Server-Sent Events (SSE) management for real-time notifications.
 */

import type { FastifyReply } from 'fastify';

// Map of listId -> Set of active SSE connections
const subscribers = new Map<string, Set<FastifyReply>>();

/**
 * Registers an SSE connection for a list.
 */
export function subscribe(listId: string, reply: FastifyReply): void {
  let listSubscribers = subscribers.get(listId);

  if (!listSubscribers) {
    listSubscribers = new Set();
    subscribers.set(listId, listSubscribers);
  }

  listSubscribers.add(reply);
}

/**
 * Unregisters an SSE connection for a list.
 */
export function unsubscribe(listId: string, reply: FastifyReply): void {
  const listSubscribers = subscribers.get(listId);

  if (listSubscribers) {
    listSubscribers.delete(reply);

    if (listSubscribers.size === 0) {
      subscribers.delete(listId);
    }
  }
}

/**
 * Notifies all subscribers of a list that something changed.
 * Clients should respond by performing a delta sync.
 */
export function notifyListChanged(listId: string): void {
  const listSubscribers = subscribers.get(listId);

  if (!listSubscribers) {
    return;
  }

  const message = `event: changed\ndata: {}\n\n`;

  for (const reply of listSubscribers) {
    try {
      reply.raw.write(message);
    } catch {
      // Connection might be closed, remove it
      listSubscribers.delete(reply);
    }
  }
}
