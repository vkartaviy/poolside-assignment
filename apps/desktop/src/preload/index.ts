/**
 * Electron preload script.
 * Exposes a safe API to the renderer process.
 */

import { contextBridge, ipcRenderer } from 'electron';
import type { HostPlatform } from '@poolside/core';

/**
 * Host Platform API Bridge Implementation
 */
const host: HostPlatform = {
  // User-scoped storage
  getItem: (key) => ipcRenderer.invoke('host:storage:get-item', key),
  setItem: (key, value) => ipcRenderer.invoke('host:storage:set-item', key, value),
  removeItem: (key) => ipcRenderer.invoke('host:storage:remove-item', key),

  // Networking
  fetch: (request) => ipcRenderer.invoke('host:fetch', request),
  openEventStream: async (request, handlers) => {
    const streamId = crypto.randomUUID();

    // Scoped channel names
    const channels = {
      open: `host:event-stream:${streamId}:open`,
      event: `host:event-stream:${streamId}:event`,
      error: `host:event-stream:${streamId}:error`,
    };

    // Subscribe to scoped channels
    if (handlers.onOpen) {
      ipcRenderer.on(channels.open, handlers.onOpen);
    }

    ipcRenderer.on(channels.event, (_, data) => handlers.onEvent(data));
    ipcRenderer.on(channels.error, (_, error) => handlers.onError(error));

    // Open stream
    await ipcRenderer.invoke('host:open-event-stream', { streamId, ...request });

    // Return cleanup function
    return async () => {
      ipcRenderer.removeAllListeners(channels.open);
      ipcRenderer.removeAllListeners(channels.event);
      ipcRenderer.removeAllListeners(channels.error);

      await ipcRenderer.invoke('host:close-event-stream', streamId);
    };
  },

  // UI support
  showContextMenu: (items) => ipcRenderer.invoke('host:show-context-menu', items),
};

const electron = {
  ipc: ipcRenderer,
};

contextBridge.exposeInMainWorld('host', host);
contextBridge.exposeInMainWorld('electron', electron);
