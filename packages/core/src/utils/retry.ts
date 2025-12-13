export const DEFAULT_RETRIES = 10;
export const DEFAULT_FACTOR = 2;
export const DEFAULT_MIN_TIMEOUT = 1_000;
export const DEFAULT_MAX_TIMEOUT = Infinity;

export const DEFAULT_BACKOFF = createBackoff();

export interface RetryOptions {
  retries?: number;
  shouldRetry?: (error: Error) => boolean | Promise<boolean>;
  onFailedAttempt?: (error: Error, currentAttempt: number) => void | Promise<void>;
  signal?: AbortSignal;
  backoff?: BackoffTimer;
}

export async function retry<T>(
  task: (currentAttempt: number) => PromiseLike<T> | T,
  options?: RetryOptions
): Promise<T> {
  const maxRetries = options?.retries ?? DEFAULT_RETRIES;
  const maxAttempts = maxRetries + 1;
  const backoff = options?.backoff ?? DEFAULT_BACKOFF;
  const shouldRetry = options?.shouldRetry;
  const onFailedAttempt = options?.onFailedAttempt;
  const signal = options?.signal;

  let attempt = 1;

  while (attempt <= maxAttempts) {
    try {
      signal?.throwIfAborted();

      const result = await task(attempt);

      signal?.throwIfAborted();

      return result;
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          // If the error is an AbortError, we should not retry
          throw error;
        }
      } else {
        throw new TypeError(`Non-error was thrown: "${error}". You should only throw errors.`);
      }

      await onFailedAttempt?.(error, attempt);

      if (attempt >= maxAttempts || (await shouldRetry?.(error)) === false) {
        throw error;
      }

      await backoff(attempt, signal);

      attempt += 1;
    }
  }

  // Should not reach here, but in case it does, throw an error
  throw new Error('Retry attempts exhausted without throwing an error.');
}

export interface BackoffOptions {
  factor?: number;
  minTimeout?: number;
  maxTimeout?: number;
}

export interface BackoffTimer {
  (attempt: number, signal?: AbortSignal): Promise<void>;
}

export function createBackoff(options?: BackoffOptions): BackoffTimer {
  const factor = options?.factor ?? DEFAULT_FACTOR;
  const minTimeout = options?.minTimeout ?? DEFAULT_MIN_TIMEOUT;
  const maxTimeout = options?.maxTimeout ?? DEFAULT_MAX_TIMEOUT;

  return async (attempt: number, signal?: AbortSignal) => {
    if (signal?.aborted) {
      return;
    }

    const delay = Math.min(minTimeout * Math.pow(factor, attempt - 1), maxTimeout);

    await new Promise<void>((resolve) => {
      const handleComplete = () => {
        clearTimeout(timer);
        signal?.removeEventListener('abort', handleComplete);
        resolve();
      };

      const timer = setTimeout(handleComplete, delay);

      signal?.addEventListener('abort', handleComplete, { once: true });
    });
  };
}
