import { describe, it } from 'mocha';
import { expect } from 'chai';
import { connectLocal } from '../../../src/adapters/in-memory';
import { setupWorker } from '../../helpers/setup';

describe('Acceptance | in-memory adapter', () => {
  let worker = setupWorker(() => connectLocal({ hello: () => 'world' }));

  it('connects to a local object', async () => {
    let result = await worker.hello();
    expect(result).to.equal('world');
  });
});
