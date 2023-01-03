declare const DEHYDRATED: unique symbol;
declare const HANDLE: unique symbol;

export type Hydrated<T extends Dehydrated<any>> = T extends Dehydrated<infer U> ? U : never;
export type Dehydrated<T> = { [DEHYDRATED]: T };

const HANDLE_KEY = '--stagehand-function-handle';

export type Handle = typeof HANDLE;
export interface DehydratedHandle {
  [HANDLE_KEY]: Handle;
}

export default class FunctionHandleRegistry {
  private nextFunctionHandle = 0;
  private handlesByFunction = new Map<Function, Handle>();
  private functionsByHandle = new Map<Handle, Function>();

  constructor(private hydrateRemoteFunction: (handle: Handle) => (...params: unknown[]) => unknown) {}

  public dehydrate<T>(root: T): Dehydrated<T> {
    return walk(root, (obj) => {
      if (typeof obj === 'function') {
        return dehydrateHandle(this.lookupOrGenerateHandle(obj));
      }
    });
  }

  public rehydrate<T extends Dehydrated<any>>(root: T): Hydrated<T> {
    return walk(root, (obj) => {
      if (isDehydratedHandle(obj)) {
        return this.hydrateRemoteFunction(obj[HANDLE_KEY]);
      }
    });
  }

  public lookupFunction(handle: Handle): Function | undefined {
    return this.functionsByHandle.get(handle);
  }

  public lookupHandle(f: Function): Handle | undefined {
    return this.handlesByFunction.get(f);
  }

  public releaseFunction(f: Function) {
    let handle = this.handlesByFunction.get(f);
    if (handle !== undefined) {
      this.functionsByHandle.delete(handle);
    }

    this.handlesByFunction.delete(f);
  }

  public reset() {
    this.handlesByFunction.clear();
    this.functionsByHandle.clear();
  }

  private lookupOrGenerateHandle(f: Function): Handle {
    let handle = this.lookupHandle(f);
    if (handle === undefined) {
      handle = this.generateHAndle();
      this.handlesByFunction.set(f, handle);
      this.functionsByHandle.set(handle, f);
    }
    return handle;
  }

  private generateHAndle(): Handle {
    return this.nextFunctionHandle++ as unknown as Handle;
  }
}

function dehydrateHandle(handle: Handle): DehydratedHandle {
  return { [HANDLE_KEY]: handle };
}

function isHandle(maybeHandle: any): maybeHandle is Handle {
  return typeof maybeHandle === 'number';
}

function isDehydratedHandle(obj: any): obj is DehydratedHandle {
  return obj && typeof obj === 'object' && isHandle(obj[HANDLE_KEY]);
}

function walk<T>(obj: T, handler: (obj: unknown) => unknown | void): any {
  let result = handler(obj);
  if (result !== undefined) {
    return result;
  }

  if (Array.isArray(obj)) {
    return obj.map((el) => walk(el, handler));
  }

  if (typeof obj === 'object' && obj) {
    if (Object.getPrototypeOf(obj) !== Object.prototype) {
      return obj;
    }

    let result: Record<string, unknown> = {};
    for (let key of Object.keys(obj)) {
      result[key] = walk((obj as any)[key], handler);
    }
    return result;
  }

  return obj;
}
