/**
 * Context menu protocol handler.
 */

import { ipcMain, Menu } from 'electron';

export function registerContextMenuHandlers(): void {
  ipcMain.handle('host:show-context-menu', (_, items: { label: string; id: string }[]) => {
    return new Promise<string | null>((resolve) => {
      const menu = Menu.buildFromTemplate(
        items.map((item) => ({
          label: item.label,
          click: () => resolve(item.id),
        }))
      );

      menu.popup({
        callback: () => resolve(null),
      });
    });
  });
}
