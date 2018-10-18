import { describe, it } from 'mocha';
import { expect } from 'chai';
import { endpointPair } from '../../src/adapters/in-memory';
import Stagehand from '../../src/stagehand';
import { waitUntil } from '../helpers/async';

describe('Acceptance | Stagehand', () => {
  async function stagehandPair(implementation?: {}) {
    let endpoints = endpointPair();
    let parent = new Stagehand();
    let child = new Stagehand(implementation);

    let listenResult = await child.listen(endpoints[0]);
    let connectResult = await parent.connect(endpoints[1]);

    return { parent, child, listenResult, connectResult };
  }

  it('connects across endpoints', async () => {
    class Hello {
      message = 'hello';
      sayHello() {
        return this.message;
      }
    }

    let { parent, connectResult } = await stagehandPair(new Hello());

    expect(connectResult).to.deep.equal({ name: 'Hello', methods: ['sayHello'] });
    expect(await parent.call('sayHello', [])).to.equal('hello');
  });

  it('can disconnect originating from the parent', async () => {
    let { parent, child } = await stagehandPair();

    expect(parent.isConnected()).to.be.true;
    expect(child.isConnected()).to.be.true;

    await parent.disconnect();
    await waitUntil(() => !child.isConnected());

    expect(parent.isConnected()).to.be.false;
    expect(child.isConnected()).to.be.false;
  });

  it('can disconnect originating from the child', async () => {
    let { parent, child } = await stagehandPair();

    expect(parent.isConnected()).to.be.true;
    expect(child.isConnected()).to.be.true;

    await child.disconnect();
    await waitUntil(() => !parent.isConnected());

    expect(parent.isConnected()).to.be.false;
    expect(child.isConnected()).to.be.false;
  });
});
