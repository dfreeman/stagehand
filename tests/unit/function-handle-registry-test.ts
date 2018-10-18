import { describe, it } from 'mocha';
import { expect } from 'chai';
import FunctionHandleRegistry, { Handle } from '../../src/function-handle-registry';

describe('Unit | FunctionHandleRegistry', () => {
  function makeRegistry() {
    return new FunctionHandleRegistry((handle: Handle) => () => handle);
  }

  describe('lookupHandle', () => {
    it('returns handles for dehydrated functions', () => {
      let registry = makeRegistry();
      let f = () => {};
      let g = () => {};

      registry.dehydrate(f);
      expect(registry.lookupHandle(f)).to.equal(0);
      expect(registry.lookupHandle(g)).to.equal(undefined);

      registry.dehydrate(g);
      expect(registry.lookupHandle(f)).to.equal(0);
      expect(registry.lookupHandle(g)).to.equal(1);
    });
  });

  describe('lookupFunction', () => {
    it('returns functions from their assigned handles', () => {
      let registry = makeRegistry();
      let f = () => {};
      let g = () => {};

      registry.dehydrate(f);
      registry.dehydrate(g);

      let fHandle = registry.lookupHandle(f);
      let gHandle = registry.lookupHandle(g);

      expect(registry.lookupFunction(fHandle!)).to.equal(f);
      expect(registry.lookupFunction(gHandle!)).to.equal(g);
    });
  });

  describe('releaseFunction', () => {
    it('clears all memory of a function handle', () => {
      let registry = makeRegistry();
      let f = () => {};
      let g = () => {};

      registry.dehydrate([f, g]);

      let fHandle = registry.lookupHandle(f);
      let gHandle = registry.lookupHandle(g);

      registry.releaseFunction(f);

      expect(registry.lookupHandle(f)).to.be.undefined;
      expect(registry.lookupHandle(g)).to.equal(gHandle);
      expect(registry.lookupFunction(fHandle!)).to.be.undefined;
      expect(registry.lookupFunction(gHandle!)).to.equal(g);
    });
  });

  describe('reset', () => {
    it('clears all memory of all function handles', () => {
      let registry = makeRegistry();
      let f = () => {};
      let g = () => {};

      registry.dehydrate([f, g]);

      let fHandle = registry.lookupHandle(f);
      let gHandle = registry.lookupHandle(g);

      registry.reset();

      expect(registry.lookupHandle(f)).to.be.undefined;
      expect(registry.lookupHandle(g)).to.be.undefined;
      expect(registry.lookupFunction(fHandle!)).to.be.undefined;
      expect(registry.lookupFunction(gHandle!)).to.be.undefined;
    });
  });

  describe('dehydrate', () => {
    it('passes through plain objects untouched', () => {
      let registry = makeRegistry();
      expect(registry.dehydrate(5)).to.equal(5);
      expect(registry.dehydrate([1, 2, 3])).to.deep.equal([1, 2, 3]);
      expect(registry.dehydrate({ a: 'hello', b: true })).to.deep.equal({ a: 'hello', b: true });
    });

    it('passes non-POJOs through untouched', () => {
      class TestClass {
        method() {
          return 'ok';
        }
      }

      let instance = new TestClass();
      let registry = makeRegistry();
      expect(registry.dehydrate(instance)).to.equal(instance);
    });

    it('inserts placeholder handles for functions', () => {
      let registry = makeRegistry();
      let f = () => {};
      let g = () => {};

      expect(registry.dehydrate([f, g, f])).to.deep.equal([
        { '--stagehand-function-handle': 0 },
        { '--stagehand-function-handle': 1 },
        { '--stagehand-function-handle': 0 }
      ]);
    });
  });

  describe('rehydrate', () => {
    it('passes through plain objects untouched', () => {
      let registry = makeRegistry();
      expect(registry.rehydrate(registry.dehydrate(5))).to.equal(5);
      expect(registry.rehydrate(registry.dehydrate([1, 2, 3]))).to.deep.equal([1, 2, 3]);
      expect(registry.rehydrate(registry.dehydrate({ a: 'hello', b: true }))).to.deep.equal({ a: 'hello', b: true });
    });

    it('rehydrates handles for functions', () => {
      let registry = makeRegistry();
      let f = () => NaN;
      let g = () => NaN;

      let rehydrated = registry.rehydrate(registry.dehydrate([f, g, f]));

      expect(rehydrated[0]()).to.equal(0);
      expect(rehydrated[1]()).to.equal(1);
      expect(rehydrated[2]()).to.equal(0);
    });
  });
});
