export function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const id = window.setTimeout(
      () => reject(new Error(`timeout after ${timeoutMs}ms`)),
      timeoutMs,
    );
    promise
      .then((value) => {
        window.clearTimeout(id);
        resolve(value);
      })
      .catch((error: unknown) => {
        window.clearTimeout(id);
        reject(error instanceof Error ? error : new Error(String(error)));
      });
  });
}
