/**
 * Storage client for persisting app state.
 *
 * All local storage operations go through this client.
 * Provides typed methods for each piece of persisted state.
 */
import type { HostPlatform } from '@poolside/core';

const KEYS = {
  userId: 'poolside:userId',
  listId: 'poolside:listId',
  joinKey: 'poolside:joinKey',
} as const;

interface StorageClientOptions {
  platform: HostPlatform;
}

export class StorageClient {
  private readonly platform: HostPlatform;

  constructor(options: StorageClientOptions) {
    this.platform = options.platform;
  }

  // User
  getUserId(): Promise<string | null> {
    return this.platform.getItem<string>(KEYS.userId);
  }

  setUserId(id: string): Promise<void> {
    return this.platform.setItem(KEYS.userId, id);
  }

  // List
  getListId(): Promise<string | null> {
    return this.platform.getItem<string>(KEYS.listId);
  }

  getJoinKey(): Promise<string | null> {
    return this.platform.getItem<string>(KEYS.joinKey);
  }

  async setList(listId: string, joinKey: string): Promise<void> {
    await Promise.all([
      this.platform.setItem(KEYS.listId, listId),
      this.platform.setItem(KEYS.joinKey, joinKey),
    ]);
  }

  async clearList(): Promise<void> {
    await Promise.all([
      this.platform.removeItem(KEYS.listId),
      this.platform.removeItem(KEYS.joinKey),
    ]);
  }
}
