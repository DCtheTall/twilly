import { createHmac } from 'crypto';
import Flow from '../Flows/Flow';
import Reply from '../Actions/Reply';


export function getSha256Hash(secret: string, key: string): string {
  const hmac = createHmac('sha256', secret);
  hmac.update(key);
  return hmac.digest('hex');
}


export function uniqueString(): string {
  return Math.random().toString(36).substring(2, 15)
       + Math.random().toString(36).substring(2, 15);
}

export function randomFlow(): Flow {
  return new Flow().addAction(
      uniqueString(),
      () => new Reply(uniqueString()),
    );
}


type AnyFunc = (...args: any[]) => any;

export function compose(...fns: AnyFunc[]): AnyFunc {
  return fns.reduce(
    (a, b) => (...args: any[]) => b(a(...args)));
}


export function randInt(): number {
  return 1 + Math.round(1000 * Math.random());
}


/**
 * Create a static deep copy of a JSON serealizable object.
 */
export function deepCopy<T>(obj: T): T {
  const result = <T>{};
  Object.keys(obj).map(
    (key: string) => {
      const val = obj[key];
      if (
        (val !== null)
        && (!(val instanceof Date))
        && (typeof val === 'object')
      ) {
        result[key] = deepCopy(val);
      } else {
        result[key] = val;
      }
    });
  return result;
}

function assertType<T>(paramName: string, typename: string, t: T) {
  if (!t || typeof t !== typename) {
    throw new TypeError(`You must use ${typename} for the ${paramName} parameter`);
  }
}

function assertInstanceof<T>(paramName: string, ctor: any, obj: any) {
  if (! obj || !(obj instanceof ctor)) {
    throw new TypeError(`You must provide an instanceof ${ctor.name} for the ${paramName} parameter`);
  }
}

export const assertFn = (paramName: string, fn: AnyFunc) => assertType(paramName, 'function', fn);

export const assertString = (paramNane: string, str: string) => assertType(paramNane, 'string', str);

export const assertFlow = (paramName: string, flow: Flow) => assertInstanceof(paramName, Flow, flow);
