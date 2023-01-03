import logger from 'debug';
import FunctionHandleRegistry, { Dehydrated } from './function-handle-registry';
import { Deferred, defer } from './utils/defer';
import { MessageEndpoint } from '.';

const debug = logger('stagehand:command-coordinator');

/**
 * Coordinates command/response pairs across a given `MessageEndpoint`, returning
 * a promise for each outgoing command and dispatching incoming ones to a given
 * executor.
 */
export default class CommandCoordinator<Commands> {
  private nextSeq = 0;
  private pendingCommands = new Map<number, Deferred<any>>();

  constructor(
    private endpoint: MessageEndpoint,
    private handleRegistry: FunctionHandleRegistry,
    private executor: Commands
  ) {
    this.endpoint.onMessage(this.messageReceived.bind(this));
  }

  public sendCommand<Name extends keyof Commands>(
    name: Name,
    ...args: CommandParams<Commands[Name]>
  ): Promise<CommandReturn<Commands[Name]>> {
    let seq = this.nextSeq++;
    let dfd = defer<CommandReturn<Commands[Name]>>();
    let command = { [COMMAND]: seq, name, args: this.handleRegistry.dehydrate(args) };

    this.pendingCommands.set(seq, dfd);
    this.sendMessage(command);

    return dfd.promise;
  }

  private async messageReceived(message: unknown): Promise<void> {
    debug('Message received %o', message);
    if (this.isResponse(message)) {
      return this.dispatchResponse(message);
    } else if (this.isCommand(message)) {
      return this.dispatchCommand(message);
    }
  }

  private dispatchResponse<Name extends keyof Commands>(response: Response<Commands, Name>) {
    let pending = this.pendingDeferred(response);
    if (pending !== undefined) {
      if (response.error) {
        pending.reject(typeof response.value === 'string' ? new Error(response.value) : response.value);
      } else {
        pending.resolve(this.handleRegistry.rehydrate(response.value));
      }
    } else {
      debug('Received a response message for an unknown command %o', response);
    }
  }

  private async dispatchCommand<Name extends keyof Commands>(message: Command<Commands, Name>) {
    let response = { [RESPONSE]: message[COMMAND], error: false, value: undefined as any };
    let method = this.executor[message.name] as unknown as (...args: any) => any;
    try {
      let result = await method(...this.handleRegistry.rehydrate(message.args));
      response.value = this.handleRegistry.dehydrate(result);
    } catch (error: any) {
      response.error = true;
      response.value = error.message || error;
    }
    this.endpoint.sendMessage(response);
  }

  private sendMessage(message: unknown) {
    debug('Sending message %o', message);
    this.endpoint.sendMessage(message);
  }

  private pendingDeferred<Name extends keyof Commands>(
    response: Response<Commands, Name>
  ): Deferred<CommandReturn<Commands[Name]>> | undefined {
    return this.pendingCommands.get(response[RESPONSE]);
  }

  private isResponse(message: any): message is Response<Commands, keyof Commands> {
    return message && typeof message[RESPONSE] === 'number';
  }

  private isCommand(message: any): message is Command<Commands, keyof Commands> {
    return message && typeof message[COMMAND] === 'number';
  }
}

const COMMAND = '--stagehand-command';
const RESPONSE = '--stagehand-response';

type CommandParams<T> = T extends (...params: infer Params) => any ? Params : never;
type CommandReturn<T> = T extends (...params: any[]) => infer Return ? Return : never;

interface Command<Commands, Name extends keyof Commands> {
  [COMMAND]: number;
  name: Name;
  args: Dehydrated<CommandParams<Commands[Name]>>;
}

interface Response<Commands, Name extends keyof Commands> {
  [RESPONSE]: number;
  error: boolean;
  value: Dehydrated<CommandReturn<Commands[Name]>>;
}
