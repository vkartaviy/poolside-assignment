/**
 * Server-Sent Events protocol handlers.
 * SSE connections via main process using EventSource.
 */

import { ipcMain, type IpcMainInvokeEvent } from 'electron';
import { EventSource } from 'eventsource';
import type { HostEventStreamRequest, HostEventStreamEvent } from '@poolside/core';

interface OpenEventStreamRequest extends HostEventStreamRequest {
  streamId: string;
}

// Active SSE streams keyed by streamId
const activeEventStreams = new Map<string, EventSource>();

export function registerEventStreamHandlers(): void {
  ipcMain.handle(
    'host:open-event-stream',
    async (event: IpcMainInvokeEvent, request: OpenEventStreamRequest): Promise<void> => {
      const { streamId, url } = request;

      // Close existing stream with same ID if any
      const existing = activeEventStreams.get(streamId);

      if (existing) {
        existing.close();
      }

      const es = new EventSource(url);

      activeEventStreams.set(streamId, es);

      // Scoped channel names - renderer only gets events for this stream
      const channels = {
        open: `host:event-stream:${streamId}:open`,
        event: `host:event-stream:${streamId}:event`,
        error: `host:event-stream:${streamId}:error`,
      };

      es.addEventListener('open', () => {
        event.sender.send(channels.open);
      });

      es.addEventListener('connected', (e) => {
        const sseEvent: HostEventStreamEvent = { name: 'connected', data: e.data ?? '' };
        event.sender.send(channels.event, sseEvent);
      });

      es.addEventListener('changed', (e) => {
        const sseEvent: HostEventStreamEvent = { name: 'changed', data: e.data ?? '' };
        event.sender.send(channels.event, sseEvent);
      });

      es.addEventListener('error', () => {
        event.sender.send(channels.error, 'Connection error');
        // Note: EventSource will auto-reconnect, no need to clean up here
      });
    }
  );

  ipcMain.handle('host:close-event-stream', (_, streamId: string): void => {
    const es = activeEventStreams.get(streamId);

    if (es) {
      es.close();

      activeEventStreams.delete(streamId);
    }
  });
}
