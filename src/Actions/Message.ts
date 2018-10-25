import { MESSAGING_SID } from '../symbols';

import Action, { ActionContext } from './Action';


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
      typeof to !== 'string'
      && (!(to.hasOwnProperty('every')
        && to.every((s: string) => typeof s === 'string')))
    ) {
      throw new TypeError(
        'Message constructor expects a string or an array of strings as the first argument');
    }
    if (typeof body !== 'string') {
      throw new TypeError(
        'Message constructor expects a string as the second argument');
    }
    super();
    this[MessageTo] = Array.isArray(to) ? to : [to];
    this[MessageBody] = body;
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

  public setMessageSids(sids: string[]) {
    this[MESSAGING_SID] = sids;
  }
}
