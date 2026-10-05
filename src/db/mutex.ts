export type Mutex = <T>(task: () => Promise<T>) => Promise<T>;

/** Aynı anda tek asenkron işlem: yazma işlemlerinin araya girmesini önler. */
export function createMutex(): Mutex {
  let tail: Promise<unknown> = Promise.resolve();
  return function runExclusive<T>(task: () => Promise<T>): Promise<T> {
    const result = tail.then(task, task);
    tail = result.catch(() => undefined);
    return result;
  };
}
