import { describe, it } from 'mocha';
import { check, type, typeOfKeys, typeOf } from '../../helpers/assertions';
import { Awaited, MethodsOnly, HandlerType, RemoteType, MaybePromise } from '../../../src/utils/types';

describe('Unit | utility types', () => {
  it('Awaited<T>', () => {
    check(
      type<Awaited<void>>().equals<void>(),
      type<Awaited<Promise<void>>>().equals<void>(),
      type<Awaited<number>>().equals<number>(),
      type<Awaited<Promise<number>>>().equals<number>()
    );
  });

  it('MethodsOnly<T>', () => {
    check(
      type<MethodsOnly<{}>>().equals<{}>(),
      type<MethodsOnly<{ a: number }>>().equals<{}>(),
      type<MethodsOnly<{ a(): number }>>().equals<{ a: () => number }>(),
      type<MethodsOnly<{ a: number; b(): number }>>().equals<{ b(): number }>(),
      type<MethodsOnly<{ a(): number; b(): number }>>().equals<{ a(): number; b(): number }>()
    );
  });

  it('MakeHandlerType<T>', () => {
    const handler = {} as HandlerType<{
      x: number;
      y(): number;
      z(input: () => number): void;
      w(): (c: number) => number;
    }>;

    check(
      typeOfKeys(handler).equals<'x' | 'y' | 'z' | 'w'>(),
      typeOf(handler.x).equals<number>(),
      typeOf(handler.y).equals<() => number | Promise<number>>(),
      typeOf(handler.z).equals<(input: () => Promise<number>) => MaybePromise<void>>(),

      // The following assertion isn't ideal, but unfortunately type inference falls over here.
      typeOf(handler.w).equals<() => MaybePromise<any>>()
      // The correct assertion would be:
      // typeOf(handler.w).equals<() => MaybePromise<() => MaybePromise<number>>>()
    );
  });

  it('MakeRemoteType<T>', () => {
    const remote = {} as RemoteType<{
      x: number;
      y(): number;
      z(input: () => number): void;
      w(): (c: number) => number;
    }>;

    check(
      typeOfKeys(remote).equals<'x' | 'y' | 'z' | 'w'>(),
      typeOf(remote.x).equals<number>(),
      typeOf(remote.y).equals<() => Promise<number>>(),
      typeOf(remote.z).equals<(input: () => MaybePromise<number>) => Promise<void>>(),
      typeOf(remote.w).equals<() => Promise<(c: number) => Promise<number>>>()
    );
  });
});
