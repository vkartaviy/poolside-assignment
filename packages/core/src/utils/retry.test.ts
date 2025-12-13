import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';
import { retry, createBackoff } from './retry';

describe('retry', () => {
  let mockBackoff: Mock;

  beforeEach(() => {
    mockBackoff = vi.fn().mockResolvedValue(undefined);
  });

  it('should resolve immediately if the task succeeds on first attempt', async () => {
    const task = vi.fn().mockResolvedValue('success');
    const result = await retry(task, { backoff: mockBackoff });
    expect(result).toBe('success');
    expect(task).toHaveBeenCalledTimes(1);
    expect(mockBackoff).not.toHaveBeenCalled();
  });

  it('should retry the specified number of times before failing', async () => {
    const error = new Error('Task failed');
    const task = vi.fn().mockRejectedValue(error);
    await expect(retry(task, { retries: 3, backoff: mockBackoff })).rejects.toThrowError(
      'Task failed'
    );
    expect(task).toHaveBeenCalledTimes(4);
    expect(mockBackoff).toHaveBeenCalledTimes(3);
  });

  it('should use exponential backoff for retries', async () => {
    const task = vi
      .fn()
      .mockRejectedValueOnce(new Error('Attempt 1'))
      .mockRejectedValueOnce(new Error('Attempt 2'))
      .mockResolvedValue('success');

    const backoff = vi.fn(createBackoff({ minTimeout: 1, factor: 2, maxTimeout: 10 }));
    const result = await retry(task, { retries: 3, backoff });

    expect(result).toBe('success');
    expect(task).toHaveBeenCalledTimes(3);
    expect(backoff).toHaveBeenCalledTimes(2);
    expect(backoff).toHaveBeenNthCalledWith(1, 1, undefined);
    expect(backoff).toHaveBeenNthCalledWith(2, 2, undefined);
  });

  it('should respect maxTimeout option', async () => {
    const task = vi.fn().mockRejectedValue(new Error('Task failed'));
    const backoff = vi.fn(createBackoff({ minTimeout: 1, maxTimeout: 2, factor: 2 }));
    await expect(retry(task, { retries: 4, backoff })).rejects.toThrowError('Task failed');
    expect(task).toHaveBeenCalledTimes(5);
    expect(backoff).toHaveBeenCalledTimes(4);
    expect(backoff).toHaveBeenNthCalledWith(1, 1, undefined);
    expect(backoff).toHaveBeenNthCalledWith(2, 2, undefined);
    expect(backoff).toHaveBeenNthCalledWith(3, 3, undefined);
  });

  it('should call onFailedAttempt for each failed attempt', async () => {
    const onFailedAttempt = vi.fn();
    const task = vi
      .fn()
      .mockRejectedValueOnce(new Error('Attempt 1'))
      .mockRejectedValueOnce(new Error('Attempt 2'))
      .mockResolvedValue('success');

    const result = await retry(task, {
      retries: 3,
      onFailedAttempt,
      backoff: mockBackoff,
    });

    expect(result).toBe('success');
    expect(onFailedAttempt).toHaveBeenCalledTimes(2);
    expect(onFailedAttempt).toHaveBeenNthCalledWith(1, expect.any(Error), 1);
    expect(onFailedAttempt).toHaveBeenNthCalledWith(2, expect.any(Error), 2);
  });

  it('should stop retrying if shouldRetry returns false', async () => {
    const shouldRetry = vi.fn().mockReturnValueOnce(true).mockReturnValueOnce(false);

    const task = vi.fn().mockRejectedValue(new Error('Task failed'));

    await expect(
      retry(task, {
        retries: 3,
        shouldRetry,
        backoff: mockBackoff,
      })
    ).rejects.toThrowError('Task failed');

    expect(task).toHaveBeenCalledTimes(2);
    expect(shouldRetry).toHaveBeenCalledTimes(2);
    expect(mockBackoff).toHaveBeenCalledTimes(1);
  });

  it('should reject with TypeError for non-Error throws', async () => {
    const task = vi.fn().mockRejectedValue('string error');

    await expect(retry(task, { backoff: mockBackoff })).rejects.toThrowError(
      new TypeError('Non-error was thrown: "string error". You should only throw errors.')
    );
  });

  it('should perform the correct number of retries', async () => {
    const task = vi
      .fn()
      .mockRejectedValueOnce(new Error('Attempt 1'))
      .mockRejectedValueOnce(new Error('Attempt 2'))
      .mockRejectedValueOnce(new Error('Attempt 3'))
      .mockResolvedValue('success');

    const result = await retry(task, { retries: 3, backoff: mockBackoff });

    expect(result).toBe('success');
    expect(task).toHaveBeenCalledTimes(4); // Initial attempt + 3 retries
    expect(mockBackoff).toHaveBeenCalledTimes(3); // Backoff called 3 times for retries
    expect(task).toHaveBeenNthCalledWith(1, 1); // Initial attempt
    expect(task).toHaveBeenNthCalledWith(2, 2); // First retry
    expect(task).toHaveBeenNthCalledWith(3, 3); // Second retry
    expect(task).toHaveBeenNthCalledWith(4, 4); // Third retry
  });
});
