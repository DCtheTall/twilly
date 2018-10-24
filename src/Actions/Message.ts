import { HALTING_ACTION, NAME, MESSAGING_SID } from '../symbols';

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
    super();
    this[MessageTo] = Array.isArray(to) ? to : [to];
    this[MessageBody] = body;
    this[HALTING_ACTION] = false;
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
