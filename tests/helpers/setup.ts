import { beforeEach, afterEach } from 'mocha';
import { MaybePromise } from '../../src/utils/types';
import { Remote, disconnect } from '../../src';

export function setupWorker<T>(callback: () => MaybePromise<Remote<T>>) {
  let { proxy, setTarget, clearTarget } = makeProxy<Remote<T>>();

  beforeEach(async () => {
    let worker = await callback();
    setTarget(worker);
  });

  afterEach(() => {
    disconnect(proxy);
    clearTarget();
  });

  return proxy;
}

function makeProxy<T extends object>() {
  let target: T | undefined;
  let setTarget = (newTarget: T) => (target = newTarget);
  let clearTarget = () => (target = undefined);
  let proxy = new Proxy<T>({} as T, {
    get(_, key: keyof T) {
      return target![key];
    },
  });

  return { proxy, setTarget, clearTarget };
}
