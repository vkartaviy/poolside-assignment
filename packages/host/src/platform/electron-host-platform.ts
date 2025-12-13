import type { HostPlatform } from '@poolside/core';

// Minimal type for Electron IPC renderer (avoid full electron dependency)
interface ElectronIpcRenderer {
  invoke(channel: string, ...args: unknown[]): Promise<unknown>;
  on(channel: string, listener: (...args: unknown[]) => void): void;
  removeListener(channel: string, listener: (...args: unknown[]) => void): void;
  removeAllListeners(channel: string): void;
}

declare global {
  interface Window {
    readonly host: HostPlatform;
    readonly electron: {
      readonly ipc: ElectronIpcRenderer;
    };
  }
}

/**
 * Electron host platform implementation.
 *
 * Uses IPC to main process for HTTP operations (CORS-free).
 * Storage uses localStorage (same as browser for now).
 */
export function createElectronHostPlatform(): HostPlatform {
  return window.host;
}
