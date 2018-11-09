import Action, {
  ActionContext,
  GetContext,
} from './Action';


const MessageTo = Symbol('to');
const MessageBody = Symbol('body');


export interface MessageContext extends ActionContext {
  body: string;
  to: string[];
}


export default class Messsage extends Action {
  private [MessageTo]: string[];
  private [MessageBody]: string;

  constructor(
    to: string | string[],
    body: string,
  ) {
    if (
      (typeof to !== 'string' || !to.length)
      && (!(Array.isArray(to)
        && to.every((s: string) => (typeof s === 'string' && Boolean(s.length)))))
    ) {
      throw new TypeError(
        'Message constructor expects a non-empty string or an array of non-empty strings as the first argument');
    }
    if (typeof body !== 'string' || !body.length) {
      throw new TypeError(
        'Message constructor expects a non-empty string as the second argument');
    }
    super();

    this[MessageTo] = Array.isArray(to) ? to : [to];
    this[MessageBody] = body;

    this[GetContext] =
      (): MessageContext => ({ to: this.to, body });
  }

  get to(): string[] {
    return this[MessageTo];
  }

  get body(): string {
    return this[MessageBody];
  }

  public getContext(): MessageContext {
    return {
      body: this[MessageBody],
      to: this.to,
    };
  }
}
