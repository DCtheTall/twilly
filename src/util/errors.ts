import { InteractionContext } from '../SmsCookie';


export type OnCatchErrorHook =
  (context: InteractionContext, user: any, err: Error) => any;
export type ErrorHandler = (err: Error) => void;


export class CaughtError extends Error {
  constructor(err: Error) {
    super(err.message);
    this.stack = err.stack;
  }
}


export function createHandleError(
  context: InteractionContext,
  user: any,
  hook: OnCatchErrorHook,
): ErrorHandler {
  return (err: Error) => {
    if (err instanceof CaughtError) throw err;
    hook(context, user, err);
    throw new CaughtError(err);
  }
}
