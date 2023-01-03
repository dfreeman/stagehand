export async function waitUntil<T>(callback: () => T | PromiseLike<T>): Promise<T> {
  let start = +new Date();
  while (+new Date() - start < 250) {
    let result = await callback();
    if (result) {
      return result;
    } else {
      await new Promise((resolve) => setTimeout(resolve, 5));
    }
  }
  throw new Error('Timeout exceeded for `waitUntil()`');
}
