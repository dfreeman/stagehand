import FunctionHandleRegistry, { Handle } from './function-handle-registry';
import { Implementation, MessageEndpoint } from './index';
import CommandCoordinator from './command-coordinator';

export default class Stagehand<T> {
  private endpoint?: MessageEndpoint;
  private commandCoordinator?: CommandCoordinator<Stagehand<T>['executor']>;
  private handleRegistry: FunctionHandleRegistry;
  private implementation?: Implementation<T> | null;

  constructor(implementation?: Implementation<T>) {
    this.implementation = implementation ?? null;
    this.handleRegistry = new FunctionHandleRegistry(this.rehydrateRemoteFunction);
  }

  public isConnected(): boolean {
    return !!this.commandCoordinator;
  }

  public async listen(endpoint: MessageEndpoint) {
    await this.startup(endpoint);
  }

  public async connect(endpoint: MessageEndpoint) {
    await this.startup(endpoint);
    return this.commandCoordinator!.sendCommand('handshake');
  }

  public async call(method: string, args: unknown[]): Promise<unknown> {
    if (!this.commandCoordinator) {
      throw new Error('Stagehand is disconnected');
    }

    return this.commandCoordinator.sendCommand('call', method, args);
  }

  public async disconnect(): Promise<void> {
    if (this.commandCoordinator) {
      await this.commandCoordinator.sendCommand('disconnect');
    }

    this.shutdown();
  }

  private async startup(endpoint: MessageEndpoint) {
    await this.disconnect();

    this.endpoint = endpoint;
    this.commandCoordinator = new CommandCoordinator(endpoint, this.handleRegistry, this.executor);
  }

  private shutdown() {
    this.handleRegistry.reset();
    this.commandCoordinator = undefined;

    if (this.endpoint) {
      this.endpoint.disconnect();
    }
  }

  private rehydrateRemoteFunction = (handleID: Handle) => {
    return (...params: unknown[]) => {
      if (!this.commandCoordinator) {
        throw new Error('Cannot call function through a disconnected stagehand');
      }

      return this.commandCoordinator.sendCommand('call', handleID, params);
    };
  };

  private executor = {
    call: (name: Handle | string, args: unknown[]): unknown => {
      let thisValue: unknown;
      let fun: unknown;
      if (typeof name === 'string') {
        fun = this.implementation && (this.implementation as any)[name];
        thisValue = this.implementation;
      } else {
        fun = this.handleRegistry.lookupFunction(name);
        thisValue = null;
      }

      if (typeof fun !== 'function') {
        throw new Error('Unable to call a nonexistent or non-function field ');
      }

      return fun.apply(thisValue, args);
    },

    handshake: () => {
      if (!this.implementation) {
        return { name: 'void', methods: [] };
      }

      let name = this.implementation.constructor.name;
      let methods = [];
      let object = this.implementation;
      while (object && object !== Object.prototype) {
        for (let key of Object.getOwnPropertyNames(object)) {
          if (typeof (this.implementation as any)[key] === 'function' && key !== 'constructor') {
            methods.push(key);
          }
        }
        object = Object.getPrototypeOf(object);
      }

      return { name, methods };
    },

    disconnect: () => {
      setTimeout(() => this.shutdown());
    },
  };
}
