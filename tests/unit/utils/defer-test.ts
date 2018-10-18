import { describe, it } from 'mocha';
import { check, typeOfKeys, typeOf } from '../../helpers/assertions';
import { defer } from '../../../src/utils/defer';

describe('Unit | defer', () => {
  it('produces the correct types', () => {
    let deferred = defer<number>();

    check(
      typeOfKeys(deferred).equals<'promise' | 'resolve' | 'reject'>(),
      typeOf(deferred.promise).equals<Promise<number>>(),
      typeOf(deferred.resolve).equals<(value: number | PromiseLike<number>) => void>(),
      typeOf(deferred.reject).equals<(error: unknown) => void>()
    );
  });
});
