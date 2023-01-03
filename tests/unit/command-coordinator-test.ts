import { describe, it } from 'mocha';
import { expect } from 'chai';
import { endpointPair } from '../../src/adapters/in-memory';
import FunctionHandleRegistry, { Handle } from '../../src/function-handle-registry';
import CommandCoordinator from '../../src/command-coordinator';
import { check, typeOf } from '../helpers/assertions';

describe('Unit | CommandCoordinator', () => {
  function makeCoordinator<T>(executor?: T) {
    let [endpoint, commandEndpoint] = endpointPair();
    let registry = new FunctionHandleRegistry((handle: Handle) => () => handle);
    let coordinator = new CommandCoordinator(commandEndpoint, registry, executor || ({} as T));
    return { endpoint, coordinator };
  }

  it('sends commands to the given endpoint', async () => {
    let { endpoint, coordinator } = makeCoordinator<{ go(a: number, callback?: () => string): void }>();
    let lastMessage: unknown;
    endpoint.onMessage((message) => (lastMessage = message));

    coordinator.sendCommand('go', 1);
    expect(lastMessage).to.deep.equal({
      '--stagehand-command': 0,
      name: 'go',
      args: [1],
    });

    coordinator.sendCommand('go', 1, () => 'ok');
    expect(lastMessage).to.deep.equal({
      '--stagehand-command': 1,
      name: 'go',
      args: [1, { '--stagehand-function-handle': 0 }],
    });
  });

  it('resolves responses to the pending promise for the corresponding command', async () => {
    let { endpoint, coordinator } = makeCoordinator<{ go(a?: number): number }>();

    let promise1 = coordinator.sendCommand('go', 1);
    let promise2 = coordinator.sendCommand('go');

    endpoint.sendMessage({ '--stagehand-response': 1, error: false, value: 123 });
    expect(await promise2).to.equal(123);

    endpoint.sendMessage({ '--stagehand-response': 0, error: false, value: 321 });
    expect(await promise1).to.equal(321);
  });

  it('rejects responses to the pending promise when the corresponding command fails', async () => {
    let { endpoint, coordinator } = makeCoordinator<{ go(a?: number): number }>();
    let promise = coordinator.sendCommand('go', 1);

    endpoint.sendMessage({ '--stagehand-response': 0, error: true, value: '💥' });
    try {
      await promise;
      expect.fail();
    } catch (error: any) {
      expect(error.message).to.equal('💥');
    }
  });

  it('enforces type safety for commands', () => {
    let { coordinator } = makeCoordinator<{
      one(a?: number): number[];
      two(...params: string[]): void;
    }>();

    check(
      typeOf(coordinator.sendCommand('one')).equals<Promise<number[]>>(),
      typeOf(coordinator.sendCommand('one', 1)).equals<Promise<number[]>>(),
      typeOf(coordinator.sendCommand('two')).equals<Promise<void>>(),
      typeOf(coordinator.sendCommand('two', 'three')).equals<Promise<void>>(),
      typeOf(coordinator.sendCommand('two', 'four', 'five')).equals<Promise<void>>()
    );
  });

  it('dispatches incoming commands to the given executor and sends back the result on success', async () => {
    let { endpoint } = makeCoordinator({
      inc(a: number) {
        return a + 1;
      },
    });

    let lastMessage: unknown;
    endpoint.onMessage((message) => (lastMessage = message));
    endpoint.sendMessage({ '--stagehand-command': 123, name: 'inc', args: [1] });

    await null;

    expect(lastMessage).to.deep.equal({ '--stagehand-response': 123, error: false, value: 2 });
  });

  it('dispatches incoming commands to the given executor and sends back any errors', async () => {
    let { endpoint } = makeCoordinator({
      boom() {
        throw new Error('💥');
      },
    });

    let lastMessage: unknown;
    endpoint.onMessage((message) => (lastMessage = message));
    endpoint.sendMessage({ '--stagehand-command': 789, name: 'boom', args: [] });

    await null;

    expect(lastMessage).to.deep.equal({ '--stagehand-response': 789, error: true, value: '💥' });
  });
});
