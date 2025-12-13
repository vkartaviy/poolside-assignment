let lastMonotonicTimestampMs = 0;

/**
 * Server-side monotonic timestamps.
 *
 * We use a composite delta-sync cursor of `(updatedAt, todoId)`, which solves the
 * "multiple todos share the same updatedAt millisecond" problem.
 *
 * However, it does NOT solve the case where the *same todo* is updated multiple
 * times in the same millisecond: `(updatedAt, id)` would be identical and a sync
 * cursor could miss the later write.
 *
 * By guaranteeing `updatedAt` is strictly increasing on every write, delta sync
 * can reliably observe every mutation without adding more cursor fields.
 */
export function getMonotonicISOString(): string {
  const nowMs = Date.now();

  if (nowMs <= lastMonotonicTimestampMs) {
    lastMonotonicTimestampMs += 1;
  } else {
    lastMonotonicTimestampMs = nowMs;
  }

  return new Date(lastMonotonicTimestampMs).toISOString();
}
