import type { IpcRenderer } from 'electron';
import type { HostPlatform } from '@poolside/core';

declare global {
  interface Window {
    readonly host: HostPlatform;
    readonly electron: {
      readonly ipc: IpcRenderer;
    };
  }
}
