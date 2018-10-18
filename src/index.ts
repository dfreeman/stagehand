import Stagehand from './stagehand';
import { RemoteType, HandlerType, MethodsOnly } from './utils/types';

const STAGEHAND_INSTANCE = '--stagehand-instance';

/**
 * The remote implementation of a type `T`. It only includes `T`s methods, and the return values
 * of those methods are all made async if they weren't already.
 */
export type Remote<T> = RemoteType<MethodsOnly<T>> & { [STAGEHAND_INSTANCE]: Stagehand };

/**
 * The necessarily implementation type of an intended remote interface `T`. All methods in
 * `Implementation<T>` are allowed to return promises even if the corresponding method in `T`
 * does not, but `Implementation<T>` also requires that all incoming callbacks be async, since
 * they correspond to a remote type themselves.
 */
export type Implementation<T> = HandlerType<T>;

/**
 * The minimal interface needed for stagehand communication. The `adapters` directory contains
 * utilities for converting common types (e.g. Node's `ChildProcess` or the Web's `MessagePort`)
 * into `MessageEndpoint`s.
 */
export interface MessageEndpoint {
  onMessage(callback: (message: unknown) => void): void;
  sendMessage(message: unknown): void;
  disconnect(): void;
}

/**
 * Given a message endpoint and a backing implementation object, listens for a connection on the
 * given endpoint and responds to commands that come in over it. This function will typically be
 * called in whatever secondary thread/process will be servicing commands from the primary.
 */
export async function launch<T>(endpoint: MessageEndpoint, implementation: Implementation<T>): Promise<Stagehand> {
  let stagehand = new Stagehand(implementation);
  stagehand.listen(endpoint);
  return stagehand;
}

/**
 * Given a message endpoint (and typically an explicit type parameter indicating the interface of
 * the remote implementation), returns a promise that will resolve when successfully connected to
 * the implementation on the other side of that endpoint.
 *
 * The resulting object will have methods defined on it that correspond to those of the backing
 * implementation, returning a promise for the eventual result of that method.
 */
export async function connect<T>(endpoint: MessageEndpoint): Promise<Remote<T>> {
  let stagehand = new Stagehand();
  let { name, methods } = await stagehand.connect(endpoint);

  class StagehandRemote {}

  for (let method of methods) {
    Object.defineProperty(StagehandRemote.prototype, method, {
      value: (...args: unknown[]) => stagehand.call(method as never, args)
    });
  }

  Object.defineProperty(StagehandRemote.prototype, STAGEHAND_INSTANCE, { value: stagehand });
  Object.defineProperty(StagehandRemote, 'name', { value: `StagehandRemote<${name}>` });

  return new StagehandRemote() as Remote<T>;
}

/**
 * Given a remote object (as returned from `connect`), disconnects from the source and closes the connection.
 */
export function disconnect<T>(remote: Remote<T>) {
  remote[STAGEHAND_INSTANCE].disconnect();
}
