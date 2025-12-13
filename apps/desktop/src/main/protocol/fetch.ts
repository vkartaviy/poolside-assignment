/**
 * HTTP fetch protocol handler.
 * CORS-free HTTP requests via main process.
 */

import { ipcMain } from 'electron';
import type { HostFetchRequest, HostFetchResponse } from '@poolside/core';

export function registerFetchHandlers(): void {
  ipcMain.handle(
    'host:fetch',
    async (_, request: HostFetchRequest): Promise<HostFetchResponse<unknown>> => {
      const res = await fetch(request.url, {
        method: request.method,
        ...(request.headers ? { headers: request.headers } : {}),
        ...(request.body != null ? { body: JSON.stringify(request.body) } : {}),
      });

      try {
        return { status: res.status, data: await res.json() };
      } catch {
        return { status: res.status };
      }
    }
  );
}
