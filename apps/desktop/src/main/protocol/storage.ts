/**
 * Storage protocol handlers.
 * Persistent key-value storage in the user data directory.
 *
 * Trade-offs: This is a simple implementation using JSON files and only a single user storage namespace.
 */

import { app, ipcMain } from 'electron';
import { readFile, writeFile, rm, mkdir } from 'node:fs/promises';
import { join } from 'node:path';

const storageDir = join(app.getPath('userData'), 'storage');

async function ensureStorageDir(): Promise<void> {
  await mkdir(storageDir, { recursive: true });
}

/** Sanitize key to be a valid filename */
function sanitizeKey(key: string): string {
  return key.replace(/[^a-zA-Z0-9-_]/g, '_');
}

function getStoragePath(key: string): string {
  const safeKey = sanitizeKey(key);

  return join(storageDir, `${safeKey}.json`);
}

export function registerStorageHandlers(): void {
  ipcMain.handle('host:storage:get-item', async (_, key: string): Promise<unknown> => {
    try {
      const data = await readFile(getStoragePath(key), 'utf-8');

      return JSON.parse(data);
    } catch {
      return null;
    }
  });

  ipcMain.handle('host:storage:set-item', async (_, key: string, value: unknown): Promise<void> => {
    await ensureStorageDir();
    await writeFile(getStoragePath(key), JSON.stringify(value), 'utf-8');
  });

  ipcMain.handle('host:storage:remove-item', async (_, key: string): Promise<void> => {
    try {
      await rm(getStoragePath(key));
    } catch {
      // Ignore if file doesn't exist
    }
  });
}
