export type DeferredState = 'pending' | 'resolved' | 'rejected';
export interface Deferred<T> {
  promise: Promise<T>;
  resolve: (value: T | PromiseLike<T>) => void;
  reject: (error: unknown) => void;
}

export function defer<T = unknown>(): Readonly<Deferred<T>> {
  let dfd = {} as Deferred<T>;
  dfd.promise = new Promise((resolve, reject) => {
    dfd.resolve = resolve;
    dfd.reject = reject;
  });
  return dfd;
}
