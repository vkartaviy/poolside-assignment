export function timeout<T>(task: Promise<T> | T, ms: number): Promise<T> {
  return new Promise<T>(async (resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new DOMException(`Task timed out after ${ms}ms`, 'TimeoutError'));
    }, ms);

    try {
      resolve(await task);
    } catch (error) {
      reject(error);
    } finally {
      clearTimeout(timer);
    }
  });
}
