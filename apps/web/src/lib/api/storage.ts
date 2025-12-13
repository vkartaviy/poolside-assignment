/**
 * Storage client singleton for persisting app state.
 *
 * All local storage operations go through this client.
 */
import { StorageClient } from '@poolside/host';
import { hostPlatform } from '$lib/host-platform.js';

export const storage = new StorageClient({
  platform: hostPlatform,
});
