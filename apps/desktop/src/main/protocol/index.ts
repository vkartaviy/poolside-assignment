/**
 * Host protocol registration.
 * Registers all IPC handlers for the host platform.
 */

import { registerStorageHandlers } from './storage';
import { registerContextMenuHandlers } from './context-menu';
import { registerFetchHandlers } from './fetch';
import { registerEventStreamHandlers } from './event-stream';

export function registerHostProtocol(): void {
  registerStorageHandlers();
  registerContextMenuHandlers();
  registerFetchHandlers();
  registerEventStreamHandlers();
}
