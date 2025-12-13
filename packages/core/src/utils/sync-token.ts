/**
 * Sync Token
 */

export interface SyncTokenPayload {
  lastUpdatedAt: string; // ISO 8601
  lastId?: string; // Tie-breaker ID
}

/**
 * Encodes a sync token payload to an opaque base64 string.
 * Works in both browser and Node.js environments.
 */
export function encodeSyncToken(payload: SyncTokenPayload): string {
  const json = JSON.stringify(payload);

  // Use Buffer in Node.js, btoa in browser
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(json, 'utf-8').toString('base64');
  }

  return btoa(json);
}

/**
 * Decodes a sync token string to its payload.
 * Returns null if the token is invalid.
 * Works in both browser and Node.js environments.
 */
export function decodeSyncToken(token: string): SyncTokenPayload | null {
  try {
    // Use Buffer in Node.js, atob in browser
    const json =
      typeof Buffer !== 'undefined' ? Buffer.from(token, 'base64').toString('utf-8') : atob(token);

    const payload = JSON.parse(json) as unknown;

    if (
      typeof payload === 'object' &&
      payload !== null &&
      'lastUpdatedAt' in payload &&
      typeof payload.lastUpdatedAt === 'string' &&
      (!('lastId' in payload) || typeof payload.lastId === 'string')
    ) {
      return payload as SyncTokenPayload;
    }

    return null;
  } catch {
    return null;
  }
}
