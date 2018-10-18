declare const OK: unique symbol;
declare const Failed: unique symbol;

type OK = typeof OK;
type Failed = typeof Failed;
type Something =
  | undefined
  | null
  | boolean
  | number
  | string
  | symbol
  | []
  | [any]
  | [any, any]
  | [any, any, any]
  | [any, any, any, any]
  | [any, any, any, any, any]
  | [any, any, any, any, any, any]
  | [any, any, any, any, any, any, any]
  | [any, any, any, any, any, any, any, any]
  | [any, any, any, any, any, any, any, any, any]
  | object;

type Values<T> = T[keyof T];

type Not<T extends OK | Failed> = T extends OK ? Failed : OK;
type And<T extends OK | Failed, U extends OK | Failed> = T extends OK ? U : Failed;
type Or<T extends OK | Failed, U extends OK | Failed> = T extends OK ? OK : U;
type If<Cond, Then, Else> = Cond extends OK ? Then : Else;

// // Union types can result in `OK | Failed` if any arm doesn't match, so we need to coalesce
// // such mixed results down into a single failure
type CoalesceFailures<T> = And<Not<IsNever<T>>, Exclude<T, OK> extends never ? OK : Failed>;

// `any extends X ? Y : Z` generally speaking returns `Y | Z`, but we can abuse this since we
// know any other type (including `never`!) will hit the false branch here.
type IsAny<T> = (T extends never ? true : false) extends false ? Failed : OK;

// `unknown` is the top type, so if our type under test extends anything, it's not `unknown`
type IsUnknown<T> = If<Or<IsAny<T>, IsNever<T>>, Failed, T extends Something ? Failed : OK>;

// `never` works very very hard to propagate through conditional types; the combination of the mapped
// and indexed types here seems to stop that propagation and ensures the result is either OK or Failed
type IsNever<T> = Values<{ [K in 0]: [T][K] extends true & false ? Not<IsAny<T>> : Failed }>;

type IsAssignableTo<T, U> = If<
  // Only `never` is assignable to `never`
  IsNever<U>,
  IsNever<T>,
  If<
    Or<
      // Anything is assignable to `any` and `unknown`
      Or<IsAny<U>, IsUnknown<U>>,
      // `any` and `never` are assignable to anything
      Or<IsNever<T>, IsAny<T>>
    >,
    OK,
    // Otherwise, check `extends`
    CoalesceFailures<T extends U ? OK : Failed>
  >
>;

type SameSpecial<T, U> = Or<And<IsAny<T>, IsAny<U>>, Or<And<IsNever<T>, IsNever<U>>, And<IsUnknown<T>, IsUnknown<U>>>>;
type IsSpecial<T> = Or<IsAny<T>, Or<IsNever<T>, IsUnknown<T>>>;
type IsEqual<T, U> = If<
  Or<IsSpecial<T>, IsSpecial<U>>,
  SameSpecial<T, U>,
  And<IsAssignableTo<T, U>, IsAssignableTo<U, T>>
>;

class Subject<T> {
  equals<U>(): IsEqual<T, U> {
    return null as any;
  }

  isAssignableTo<U>(): IsAssignableTo<T, U> {
    return null as any;
  }

  isNotAssignableTo<U>(): Not<IsAssignableTo<T, U>> {
    return null as any;
  }

  isAssignableFrom<U>(): IsAssignableTo<U, T> {
    return null as any;
  }

  isNotAssignableFrom<U>(): Not<IsAssignableTo<U, T>> {
    return null as any;
  }

  isAny(): IsAny<T> {
    return null as any;
  }

  isNever(): IsNever<T> {
    return null as any;
  }

  isUnknown(): IsUnknown<T> {
    return null as any;
  }
}

const subject = new Subject<any>();

export function typeOf<T>(_expr: T): Subject<T> {
  return subject;
}

export function exactTypeOf<T extends Something>(_expr: T): Subject<T> {
  return subject;
}

export function typeOfKeys<T>(_expr: T): Subject<keyof T> {
  return subject;
}

export function type<T>(): Subject<T> {
  return subject;
}

export function check(..._assertions: OK[]) {}

function assertTrue(_arg: OK): void {}
function assertFalse(_arg: Failed): void {}

assertTrue(type<unknown>().isUnknown());
assertTrue(type<unknown>().equals<unknown>());
assertTrue(type<unknown>().isAssignableFrom<unknown>());
assertTrue(type<unknown>().isAssignableTo<unknown>());
assertFalse(type<unknown>().isAny());
assertFalse(type<unknown>().equals<any>());
assertTrue(type<unknown>().isAssignableTo<any>());
assertTrue(type<unknown>().isAssignableFrom<any>());
assertFalse(type<unknown>().isNever());
assertFalse(type<unknown>().equals<never>());
assertFalse(type<unknown>().isAssignableTo<never>());
assertTrue(type<unknown>().isAssignableFrom<never>());
assertFalse(type<unknown>().equals<number>());
assertFalse(type<unknown>().isAssignableTo<number>());
assertTrue(type<unknown>().isAssignableFrom<number>());

assertFalse(type<any>().isUnknown());
assertFalse(type<any>().equals<unknown>());
assertTrue(type<any>().isAssignableFrom<unknown>());
assertTrue(type<any>().isAssignableTo<unknown>());
assertTrue(type<any>().isAny());
assertTrue(type<any>().equals<any>());
assertTrue(type<any>().isAssignableTo<any>());
assertTrue(type<any>().isAssignableFrom<any>());
assertFalse(type<any>().isNever());
assertFalse(type<any>().equals<never>());
assertFalse(type<any>().isAssignableTo<never>());
assertTrue(type<any>().isAssignableFrom<never>());
assertFalse(type<any>().equals<number>());
assertTrue(type<any>().isAssignableTo<number>());
assertTrue(type<any>().isAssignableFrom<number>());

assertFalse(type<never>().isUnknown());
assertFalse(type<never>().equals<unknown>());
assertFalse(type<never>().isAssignableFrom<unknown>());
assertTrue(type<never>().isAssignableTo<unknown>());
assertFalse(type<never>().isAny());
assertFalse(type<never>().equals<any>());
assertTrue(type<never>().isAssignableTo<any>());
assertFalse(type<never>().isAssignableFrom<any>());
assertTrue(type<never>().isNever());
assertTrue(type<never>().equals<never>());
assertTrue(type<never>().isAssignableTo<never>());
assertTrue(type<never>().isAssignableFrom<never>());
assertFalse(type<never>().equals<number>());
assertTrue(type<never>().isAssignableTo<number>());
assertFalse(type<never>().isAssignableFrom<number>());

assertTrue(type<number>().equals<number>());
assertTrue(type<number>().isAssignableTo<number>());
assertFalse(type<number>().isAssignableTo<5>());
assertTrue(type<number>().isAssignableFrom<5>());

assertTrue(type<5>().equals<5>());
assertTrue(type<5>().isAssignableTo<5>());
assertTrue(type<5>().isAssignableTo<number>());
assertFalse(type<5>().isAssignableFrom<number>());

assertTrue(typeOf(5).equals<number>());
assertTrue(exactTypeOf(5).equals<5>());
assertTrue(typeOf('hi').equals<string>());
assertTrue(exactTypeOf('hi').equals<'hi'>());
assertTrue(typeOf(true).equals<boolean>());
assertTrue(exactTypeOf(true).equals<true>());

assertTrue(type<'a'>().equals<'a'>());
assertFalse(type<'a'>().equals<'b'>());
assertTrue(type<'a'>().isAssignableFrom<'a'>());
assertFalse(type<'a'>().isAssignableFrom<'a' | 'b'>());
assertTrue(type<'a'>().isAssignableTo<'a' | 'b'>());
assertTrue(type<'a'>().isAssignableFrom<'a' & 'b'>());
assertFalse(type<'a'>().isAssignableTo<'a' & 'b'>());
assertTrue(type<'a'>().isAssignableTo<string>());
assertFalse(type<'a'>().isAssignableFrom<string>());

assertTrue(type<'a' | 'b'>().equals<'a' | 'b'>());
assertTrue(type<'a' | 'b'>().isAssignableFrom<'a'>());
assertFalse(type<'a' | 'b'>().isAssignableTo<'a'>());
assertTrue(type<'a' | 'b'>().isAssignableTo<string>());
assertFalse(type<'a' | 'b'>().isAssignableFrom<string>());

assertTrue(type<'a' & 'b'>().equals<'a' & 'b'>());
assertFalse(type<'a' & 'b'>().isAssignableFrom<'a'>());
assertTrue(type<'a' & 'b'>().isAssignableTo<'a'>());
assertTrue(type<'a' & 'b'>().isAssignableTo<string>());
assertFalse(type<'a' & 'b'>().isAssignableFrom<string>());

// Unfortunately there doesn't seem to be a practical way of inferring the precise type of
// the elements of a tuple, e.g. `[1, 2]`, but we can at least identify a tuple vs an array
assertTrue(typeOf([1, 2]).equals<number[]>());
assertTrue(exactTypeOf([1, 2]).equals<[number, number]>());

// Unfortunately we can't well capture `any` and friends lurking deeper in the structure of types
// These assertions, while unfortunate, are the expected result of that.
assertTrue(type<() => any>().equals<() => number>());
assertTrue(type<() => number>().equals<() => any>());
assertTrue(type<any[]>().equals<number[]>());
assertTrue(type<number[]>().equals<any[]>());
