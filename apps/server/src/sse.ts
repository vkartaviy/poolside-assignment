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
 *
 * Trade-off: We send immediately on every update rather than throttling.
 * This prioritizes low latency over efficiency under burst load. For a todo app
 * with infrequent updates, immediate notification is the right choice. High-frequency
 * collaborative apps (e.g., real-time editors) would debounce here (batch changes
 * within a 50ms window) to reduce SSE traffic at the cost of added latency.
 */
export function notifyListChanged(listId: string): void {
  const listSubscribers = subscribers.get(listId);

  if (!listSubscribers) {
    return;
  }

  const message = `event: changed\ndata: {}\n\n`;

  for (const reply of listSubscribers) {
    try {
      // Trade-off: We ignore the return value of write() (backpressure signal).
      // If a client is slow, write() returns false when the buffer is full (~16KB),
      // and we should wait for 'drain' before writing more. For SSE notifications
      // of ~15 bytes each, we'd need ~1000 rapid events to one slow client to hit
      // this limit - unlikely for a todo app. High-frequency systems would track
      // backpressured connections and skip/disconnect them until 'drain'.
      reply.raw.write(message);
    } catch {
      // Connection might be closed, remove it
      listSubscribers.delete(reply);
    }
  }
}
