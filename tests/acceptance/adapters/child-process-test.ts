import { describe, it } from 'mocha';
import { expect } from 'chai';
import { connect, launch } from '../../../src/adapters/child-process';
import { fork } from 'child_process';
import { setupWorker } from '../../helpers/setup';

interface HelloWorker {
  hello(): string;
}

if (process.send) {
  launch<HelloWorker>({ hello: () => 'world' });
} else {
  describe('Acceptance | child-process adapter', () => {
    let worker = setupWorker(() =>
      connect<HelloWorker>(fork(__filename, [], { execArgv: ['-r', 'ts-node/register'] }))
    );

    it('communicates between parent and child', async () => {
      let result = await worker.hello();
      expect(result).to.equal('world');
    });
  });
}
