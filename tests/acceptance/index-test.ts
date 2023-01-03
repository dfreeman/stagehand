import { describe, it } from 'mocha';
import { expect } from 'chai';
import { EventEmitter } from 'events';
import { connectLocal } from '../../src/adapters/in-memory';
import { setupWorker } from '../helpers/setup';

describe('Acceptance | end to end exercises', () => {
  describe('EchoWorker', () => {
    let worker = setupWorker(() =>
      connectLocal({
        echo(message: string): string {
          return message;
        },

        repeat(message: string, count = 1): string[] {
          return Array(count).fill(message);
        },

        async hollaback(message: () => Promise<string>): Promise<string> {
          let string = await message();
          return string.toUpperCase();
        },
      })
    );

    it('serializes strings', async () => {
      expect(await worker.echo('hi')).to.equal('hi');
      expect(await worker.repeat('hi', 3)).to.deep.equal(['hi', 'hi', 'hi']);
    });

    it('serializes callbacks', async () => {
      expect(await worker.hollaback(() => 'hi')).to.equal('HI');
      expect(await worker.hollaback(async () => 'hi')).to.equal('HI');
    });

    it("doesn't leak memory", async function () {
      this.slow(1_000);

      let iterations = 10;
      let size = 100_000;

      let memBefore = process.memoryUsage().heapUsed;

      for (let i = 0; i < iterations; i++) {
        let result = await worker.repeat('hi', size);
        expect(result.length).to.equal(size);
      }

      global.gc();

      let memAfter = process.memoryUsage().heapUsed;

      // The allocated arrays should each consume more than `size`, since each array
      // element requires more than a single byte, but this check is a reasonable
      // smoke test, and it correctly fails without the fix for the leak reported in
      // #8 in place.
      expect(memAfter - memBefore).to.be.lessThan(iterations * size);
    });
  });

  describe('EventEmitter', () => {
    let emitter = new EventEmitter();
    let worker = setupWorker(() => connectLocal(emitter));

    it('invokes callbacks both directions', async () => {
      let localTriggered = new Promise((resolve) => worker.once('local', resolve));
      emitter.emit('local', 'hello from local');

      let remoteTriggered = new Promise((resolve) => emitter.once('remote', resolve));
      worker.emit('remote', 'hello from remote');

      expect(await localTriggered).to.equal('hello from local');
      expect(await remoteTriggered).to.equal('hello from remote');
    });
  });
});
