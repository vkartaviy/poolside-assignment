/**
 * Platform detection and factory.
 * Returns the appropriate HostPlatform based on runtime environment.
 */

import type { HostPlatform } from '@poolside/core';
import { createBrowserHostPlatform, createElectronHostPlatform } from '@poolside/host';

/**
 * Create the appropriate HostPlatform for the current environment.
 * - In Electron: uses IPC to main process for CORS-free HTTP
 * - In browser: uses browser APIs directly
 */
export function createHostPlatform(): HostPlatform {
  if (typeof window !== 'undefined' && window.electron != null && window.host != null) {
    return createElectronHostPlatform();
  }

  return createBrowserHostPlatform();
}

export const hostPlatform = createHostPlatform();
