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


type AnyFunc =
  (...args: any[]) => any;

export function compose(...fns: AnyFunc[]): AnyFunc {
  return fns.reduce(
    (a, b) => (...args: any[]) => b(a(...args)));
}


export function randInt(): number {
  return 1 + Math.round(1000 * Math.random());
}


/**
 * Create a static deep copy of a serealizable object
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
